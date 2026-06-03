# Shopulse Stack Migration — Design Spec

**Date:** 2026-06-02
**Branch:** `feat/backend`
**Status:** IMPLEMENTED — all 4 tracks committed on `feat/backend` (A 5e321d5, B a1ba713, C 32e4448, D 5099347) as of 2026-06-03. Remaining: live side-by-side QA + deploy. **Deviation:** Track C uses the OpenAI-compatible **Chat Completions API on Groq** (free), NOT the OpenAI Responses API — Assistants/Responses are OpenAI-proprietary and the OpenAI account was quota-dead. Thread export (§6.1a) was skipped (fresh start; Atlas decommissioned).

> Designed autonomously per the user's instruction ("you decide, I check the result").
> Validated by a 5-agent design workflow (4 subsystem designers + 1 adversarial staff-engineer review).
> The adversarial review's corrections are folded into this spec — where a subsystem designer
> and the reviewer disagreed, the reviewer won.

---

## 1. Goal

Migrate the Shopulse research prototype across four axes, **without changing the product/UX**:

| Axis | From | To |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind (AWS S3/CloudFront) | **Svelte 5 (runes) + Tailwind on Cloudflare Pages** |
| Backend | Express.js on EC2 / half-done AWS Lambda | **Cloudflare Workers + Hono** |
| Database | MongoDB Atlas + Mongoose | **Supabase (Postgres)** |
| LLM API | OpenAI **Assistants** API (deprecated, sunset Aug 2026) | OpenAI **Responses** API |

The visible behavior — three UI paradigms (CUI `/chat`, GUI `/gui`, Hybrid `/hybrid`), the TV-shopping assistant, product search/filter, the 720s session timer, the guided tour, the per-thread statistics — stays identical. This is an infrastructure + API migration, **not a redesign**.

The abandoned AWS work (`lambda-functions/`, `terraform/`, `Dockerfile`, Pug `views/`, file logger) is **deleted**, not ported.

---

## 2. Architecture (target)

```
Browser (Svelte 5 SPA on Cloudflare Pages)
   │  fetch / fetch-stream (CORS)
   ▼
Cloudflare Worker  (single Hono app: /chat /products /user)
   ├── OpenAI Responses API   (model + tool calling, previous_response_id chaining)
   └── Supabase Postgres       (products, reviews, users, conversations, messages)
```

- **One Worker**, not three. The chat handler calls products/user logic as **direct function calls**, not HTTP hops.
- **No DynamoDB, no Durable Object.** The connection-relay problem they solved is *deleted*, not re-solved (see §5.2).
- **Worker holds the Supabase service-role key**; the browser never talks to Supabase directly. Same trust boundary as today's Express app owning the Mongo URL.

---

## 3. The decisions (and why)

These were the open questions. Decided autonomously:

1. **OpenAI → Responses API** (not "keep Assistants + bump SDK"). Assistants sunsets Aug 2026; migrating now is the point of "latest schema." The 3s-poll-×5 loop disappears — the response streams tool calls directly.
2. **Supabase as source of truth for conversation state** — NOT OpenAI's Conversations API. Turn chaining uses `previous_response_id` (one column). Rationale: Responses has no updatable per-message metadata (the image-reattachment hack forces local storage anyway), and the whole research output is the statistics, which become one SQL query against local rows. The Conversations API would be a second source of truth buying nothing for short, 3-thread-capped chats. *(Reviewer YAGNI call — adopted.)*
3. **Frontend = plain Vite + Svelte 5 SPA**, not SvelteKit. Three routes, all behind a login gate, all client-state-heavy (live stream + timer). SSR buys nothing and adds hydration footguns. CF Pages serves the SPA with a one-line `_redirects` fallback.
4. **Backend = single Hono Worker.** Justified in §2.

---

## 4. Subsystem designs

### 4.1 Database (MongoDB → Supabase Postgres)

**Schema** — JSONB for dynamic/display data, promoted typed columns for the ~8 fields actually filtered/sorted.

```sql
create extension if not exists pg_trgm;   -- only if typo-tolerance is a measured requirement (see §7)

create table users (
  id          text primary key,            -- keep existing 8-char short uid scheme
  created_at  timestamptz not null default now()
);

create table products (
  id            uuid primary key default gen_random_uuid(),
  amazon_url    text unique,               -- natural key from Mongo map key → idempotent ETL
  model_code    text,
  name          text not null,
  price         numeric(10,2),
  -- promoted, ETL-normalized typed columns (source strings are dirty: "48\"", "120 Hz", "4K (2160P)")
  brand          text,
  resolution     text,                     -- normalized '8k' | '4k' | '1080p'
  screen_type    text,                     -- normalized 'oled' | 'qled' | 'led'
  refresh_rate   int,                      -- "120 Hz" → 120
  screen_size_in numeric(5,1),             -- "48\"" → 48.0
  rating         numeric(2,1),
  review_count   int default 0,
  -- display/payload blobs
  short_spec          jsonb not null default '{}',
  spec                jsonb not null default '{}',
  features            jsonb,               -- parsed from productFeatures JSON-string at ETL
  detail              jsonb,               -- parsed from productDetail JSON-string at ETL
  image_list          text[] default '{}',
  rating_distribution jsonb default '[]',
  search_tsv tsvector generated always as (
       setweight(to_tsvector('english', coalesce(name,'')), 'A')
    || setweight(to_tsvector('english', coalesce(spec->>'Features','')), 'B')
    || setweight(to_tsvector('english', coalesce(brand,'')), 'A')
  ) stored,
  created_at timestamptz not null default now()
);

create table reviews (
  id           bigint generated always as identity primary key,
  product_id   uuid not null references products(id) on delete cascade,
  user_name    text, title text, review_date text,
  rating       numeric(2,1),               -- "5.0" → 5.0 at ETL
  body         text
);
create index reviews_product_idx on reviews(product_id);

-- Chat (replaces Mongo Thread; max 3 enforced in Worker)
create table conversations (
  id                uuid primary key default gen_random_uuid(),
  user_id           text not null references users(id) on delete cascade,
  openai_thread_id  text,                  -- legacy Assistants thread id (export provenance)
  last_response_id  text,                  -- Responses previous_response_id chain
  ui_variant        text,                  -- 'chat'|'gui'|'hybrid' (research dimension)
  created_at        timestamptz not null default now(),
  last_active       timestamptz not null default now()
);
create index conversations_user_idx on conversations(user_id);

-- THE reconciled messages table (see §6 mismatch B): flat metadata blob + promoted tool_call_name
create table messages (
  id              bigint generated always as identity primary key,
  conversation_id uuid not null references conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant')),
  content         text not null default '',
  tool_call_name  text,                    -- promoted for indexable stats: filter_products | get_product_details | get_product_reviews
  metadata        jsonb not null default '{}',  -- EXACT frontend contract: img_list_N, product_name_list, product_id_list, product_price_list, product_rating_list, product_review_count_list, filtering_condition, product_review
  response_id     text,
  created_at      timestamptz not null default now()  -- granularity: see §7
);
create index messages_conv_idx on messages(conversation_id, created_at);
```

**Replacing Atlas `$search`** — one Postgres RPC `search_products(...)` callable via `supabase.rpc()` that:
- Matches `keyword` via `search_tsv @@ websearch_to_tsquery(...)` (+ optional `pg_trgm` fuzzy fallback).
- Applies brand/resolution/screen_type/refresh_rate as **equality on normalized columns** — the old `mustNot` conflict exclusions collapse to equality (clean enum column excludes others inherently).
- Price/screen-size as `>=`/`<=` range on `numeric` columns.
- Connectivity/smart-platform/supported-service/features as `ilike` over JSONB `spec`/`short_spec` text.
- Brand **round-robin** via `row_number() over (partition by brand ...)` then `order by rn_in_brand, brand` — reproduces the Mongo `$group` + flatten loop.
- `sortBy` rating/price/popularity via `case`-based `ORDER BY`; pagination via `limit/offset`.

`/products/:id` and `/:id/reviews` become plain selects (`features`/`detail` already parsed JSONB — no read-time `JSON.parse`).

**ETL** — one-time Node script over `sample.json` (189 TVs, URL-keyed dict), `upsert(onConflict:'amazon_url')` (re-runnable). Parses JSON-strings, normalizes dirty spec strings into typed columns, inserts products then their reviews. The `resolution`/`screen_type` classifiers are the only judgment calls — **log every fallthrough**, and **gate cutover on a full result-diff of old Atlas `$search` vs new RPC across a fixed query set** (189 rows → full diff is trivial). See §6.1b.

**RLS** — anon key unused; Worker uses service-role only. Enable RLS *only* if the anon key is ever exposed; until then it's bypassed ceremony. *(Reviewer YAGNI — adopted.)*

### 4.2 OpenAI (Assistants → Responses API)

| Assistants (now) | Responses (target) |
|---|---|
| `threads.create()` | `conversations` row in Supabase + `previous_response_id` chain (no OpenAI Conversations object) |
| `messages.create` + `runs.create` | single `responses.create({ model, instructions, tools, input, stream:true })` |
| `assistant_id` (dashboard config) | `instructions` + `tools` + `model` passed inline, **versioned in code** |
| poll `runs.retrieve()` 3s×5 | **gone** — consume the stream |
| `requires_action` → `submit_tool_outputs` | stream `function_call` items → continuation `responses.create` with `function_call_output` items |
| `messages.update(threadId,id,{metadata})` | **gone** — metadata → Supabase `messages.metadata` JSONB |
| `messages.list()` | query Supabase `messages` (source of truth for UI + stats) |

**Control flow** — the poll loop is replaced by: open stream → on `function_call` items, run tools, open continuation stream → repeat until no tool calls → persist final assistant row with metadata. **No `maxAttempts` cap, BUT a hard wall-clock budget (~80s) aborts with `{type:'error'}`** so "no cap" doesn't become "hang until the 100s edge kill." *(Reviewer correction.)*

**Strip/reattach** — unchanged semantics, refactored into one `splitToolResults()`:
- **Model-facing** (`function_call_output`): strip `productImageList`, collapse `productReview` to `reviewList`. Images never reach the model's text — exactly as today.
- **Out-of-band metadata** (Supabase `messages.metadata`): the exact flat keys `Threads.jsx` parses (`img_list_N` chunked by 5, `product_name_list`, `product_id_list`, `product_price_list`, `product_rating_list`, `product_review_count_list`, `filtering_condition`, `product_review`, `tool_call_name`).

**Tool defs** — Responses flattens `{type:'function', name, description, parameters}` (not nested under `function`). **Before deleting the Assistant, `assistants.retrieve(OPENAI_ASSISTANT_ID)` once** and copy `.instructions`, `.tools`, `.model` verbatim into `src/llm/systemPrompt.js` + `TOOLS` so behavior is bit-for-bit preserved.

**Statistics** — becomes a SQL query (window `lag()` for response-time deltas, `count(*) filter (where tool_call_name=...)` for tool counts) — same arithmetic, faster, against local rows.

### 4.3 Backend (Express → Cloudflare Workers + Hono)

- **Single Hono app** mounting `/chat /products /user`. Internal `fetch('localhost:3000/...')` calls → direct `(env, args)` function calls (no localhost on Workers anyway).
- **SSE = stream the POST.** `POST /chat/messages` returns `text/event-stream` and emits `runStatus` + final `messages` frames on its own body via Hono `streamSSE`. The connection `Map`, `addConnection/removeConnection/cleanupConnection/sendMessageUpdateToUser`, and the entire `GET /chat` endpoint are **deleted** — they cannot work cross-isolate on Workers.
- **Keep-alive**: 20s `:ping` comment frames (CF tears down a stream idle ~100s).
- **SDK gotchas**: `compatibility_flags=["nodejs_compat"]`; create `@supabase/supabase-js` client with `{ global:{ fetch: fetch.bind(globalThis) }, auth:{ persistSession:false } }`; no `fs`/`path`/Pug/`morgan` (use `console.log` + `[observability]`).
- **Secrets** via `wrangler secret`: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY` (service-role), `OPENAI_MODEL`; local `.dev.vars`.
- **CORS**: port the allowlist; drop the dead S3 origin, add CF Pages prod + `*.pages.dev` preview.

### 4.4 Frontend (React → Svelte 5 + Tailwind on Cloudflare Pages)

- **Plain Vite + Svelte 5 SPA**, `svelte-routing`-style router for the 3 routes (+ nested `/gui/products/:id`). `public/_redirects`: `/*  /index.html  200`.
- `tailwind.config.js` ports **verbatim** (only the `content` glob changes) — all ~4444 lines of class strings copy across. Biggest de-risking fact.
- **`UserSessionContext` (317 LOC) → a module-singleton rune store** (`src/lib/session.svelte.js`): `useState`→`$state`, derived effects→`$derived`, refs→`bind:this`. The SSE lifecycle moves to a top-level `App.svelte` `$effect` (module-level `$effect` needs an effect root).
- **Pure-JS extraction wins**: lift `Gui.jsx`'s ~470 lines of query-string logic into `lib/filterQuery.js`, and `Threads.jsx`'s metadata parser into `lib/parseMessages.js` — reuse verbatim, framework-agnostic.
- **Library swaps**: `react-markdown`→keep existing `marked` + `{@html}` (sanitize); two toast libs → one (`svelte-sonner`/`svelte-french-toast`); `react-joyride`→**driver.js** (highest-risk, no drop-in); `react-medium-image-zoom`→`svelte-medium-image-zoom`; `ldrs`→**keep** (framework-agnostic web components); `feather-icons-react`→`svelte-feather-icons`; **delete** `react-fast-compare` + memo, dead `react-scroll`, `axios`→native `fetch`.
- **SSE consumption is NOT a 1:1 port** (see §6 mismatch A): replace `EventSource` GET with a `fetch`-POST `ReadableStream` reader; fetch history via `GET /chat/threads/messages` on thread-select. Same frame *payloads*, different *transport*.

---

## 5. Key structural changes worth calling out

### 5.1 The poll loop dies
`add msg → run → sleep(3s) → poll ×5 → maybe submit tools` becomes a single stream you react to. Net deletions: `runMessage`, `checkRunStatus`, `checkRunSteps`, `submitToolOutputs`, `modifyMessage`, the `setTimeout`/`maxAttempts` loop.

### 5.2 The connection Map dies
The old `GET /chat` SSE + `activeConnections` Map existed only so the fire-and-forget POST could find the GET's open socket. Streaming the POST itself removes the second connection entirely — so **no DynamoDB, no Durable Object**. The only durable state (userId↔threadId, max-3, timestamps) was already in the DB.

---

## 6. Cross-cutting risks & corrections (from adversarial review)

### 6.1 Data-loss / irreversible

**(a) Assistants threads are orphaned — owned export step, BEFORE OpenAI cutover.**
Today the full transcript + reattached metadata live **only** inside OpenAI Assistants threads; Mongo holds pointers, not content. There is no API to import old threads into Responses. **One-time export script**: for every `Thread.threadId`, `messages.list()` the full transcript *including metadata*, write into Supabase `messages` — **preserving OpenAI's `created_at` verbatim** (stats depend on it). Run eagerly (not lazily) — Assistants may sunset before a user returns. **This is the single most irreversible action in the migration.**

**(b) Product ETL classifier distortion.** A misclassified `resolution`/`screen_type` makes a product silently unreachable by the exact filters the research measures. Gate cutover on a full old-vs-new result diff, not a spot check.

### 6.2 Sequencing — NOT big-bang

Safe order, working system at every step:

> **Sequencing correction (post-design, confirmed):** Mongoose/the Mongo driver **cannot run on Cloudflare Workers** (needs Node `net.Socket`/TLS that Workers' `connect()` doesn't satisfy — confirmed against MongoDB + Cloudflare docs). So the original "Workers backend keeping Mongo initially" is impossible: the Worker has no way to reach Mongo. The Supabase data layer therefore must land **before/with** the Workers move, not after. Revised order below. (The Assistants API itself is HTTP/fetch-based and *does* run on Workers, so "keep Assistants, move runtime" still holds for chat.)

1. **Track A — Supabase data layer (Node, standalone).** Schema + `search_products`/`conversation_statistics` RPCs + one-time ETL + pure `(env,args)` data functions for products/user. Verify by **result-diffing against Mongo** in plain Node. Zero Worker/frontend risk. *This is the true unblock-everything foundation.*
2. **Track B — Backend → Workers/Hono**, reading Supabase, **keeping Assistants API** for chat. `streamSSE` on the POST instead of the connection Map. Verify against the *old React frontend* via a tiny fetch-stream shim behind `postData('/chat/messages')`. Isolates "does Workers SSE work."
3. **Track C — Assistants → Responses API**, *after* the export script (6.1a) has run and verified. Metadata writes to Supabase. Frontend untouched (same frames + metadata keys).
4. **Track D — React → Svelte last**, against the now-stable backend contract (transport already a fetch reader → copies known-working logic).

### 6.3 Contract mismatches (reconciled here)

- **A — SSE transport.** Frontend designer assumed `EventSource` survives; backend designer deletes it. **Resolution: payloads identical, transport = fetch-stream on the POST.** The frontend SSE port is a *rewrite*, not 1:1 — scoped accordingly above.
- **B — two incompatible `messages` schemas.** **Resolution: one table (§4.1) with BOTH a flat `metadata` JSONB blob (frontend contract) AND a promoted `tool_call_name` column (indexable stats).** `id bigint`, `conversation_id uuid → conversations.id`.
- **C — statistics timestamp granularity.** Old stats use OpenAI second-granularity `created_at`; new DB rows are ms-granularity. Mixing across the migration boundary is a **methodology break, not a bug fix**. **OPEN — researcher's call** (§7).
- **D — word-count algorithm.** `split(' ')` → `split(/\s+/)` shifts every historical number. Same continuity decision (§7). Compute word_count in the query (not a generated column) so the rule stays one-line-editable.

### 6.4 Biggest single risk
The chat tool-loop inside one streaming Worker request, intersecting three migrations (runtime + OpenAI API + transport) with no working fallback. De-risk by **sequencing** (§6.2) and the **~80s wall-clock abort** (§4.2).

### 6.5 YAGNI drops (189 products, 3 threads/user)
- No OpenAI Conversations dual-write — use `previous_response_id`.
- GIN/trigram indexes optional — seq scan on 189 rows is sub-ms; keep `pg_trgm` only if typo-tolerance is a measured requirement.
- No RLS policies while anon key is unused + Worker is service-role (it'd be bypassed).
- No `generated` `word_count` column — compute in the stats query.

---

## 7. Open decisions for the researcher (NOT engineering calls)

These change the *research dataset*, so they need the project owner's ruling — flagged, not silently decided:

1. **Timestamp granularity continuity** (§6.3-C): keep OpenAI second-granularity end-to-end, OR adopt ms-granularity and version the dataset (never aggregate across the boundary)?
2. **Word-count algorithm** (§6.3-D): match historical `split(' ')`, or adopt the more-correct `split(/\s+/)`?
3. **Typo-tolerance** in product search: is fuzzy matching a measured variable (keep `pg_trgm`) or not (drop it)?

Default if no answer: preserve historical behavior (second-granularity, `split(' ')`, keep `pg_trgm`) to protect dataset continuity.

---

## 8. Effort estimate (rough, one engineer)

| Track | Estimate |
|---|---|
| Backend → Workers/Hono (keep Assistants) + SSE-on-POST | 2–3 days |
| Supabase schema + RPC + ETL + result-diff gate | 2–3 days |
| Assistants → Responses (incl. export script) | 2–3 days |
| React → Svelte (incl. driver.js tour, SSE rewrite) | 5–8 days |
| **Total** | **~11–17 days** |

Heavy fractions are *copy, not rewrite* (Tailwind classes, query-string engine, metadata parser). Riskiest items: driver.js tour, the rune-store + SSE rewrite, the chat tool-loop on Workers.

---

## 9. What this spec does NOT cover (future, separate specs)

- The actual implementation plan (step-by-step) — produced next via the writing-plans workflow.
- Custom-domain DNS cutover (`api.shopulse.xyz`, Pages prod domain).
- Cleanup commit deleting `lambda-functions/`, AWS `terraform/`, `Dockerfile`, Pug `views/`, `middleware/logger.js`.
- Any UX/feature change (explicitly out of scope — faithful port only).
