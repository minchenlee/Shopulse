# Track B — Cloudflare Workers + Hono Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Replace the Express backend with a single Cloudflare Worker (Hono) that mounts `/products`, `/user`, `/chat`, reads the Track A Supabase `data/` layer via direct function calls, and delivers chat over SSE **streamed from the POST** — keeping the OpenAI **Assistants** API unchanged for now (Track C swaps it).

**Architecture:** One Hono app in `worker/`. Route handlers are thin wrappers over the `data/` functions (imported as a local workspace dep) plus a `chat` module that holds the Assistants poll-loop but emits over `streamSSE` on `POST /chat/messages` instead of a server-side connection Map. The old `GET /chat` SSE endpoint and `activeConnections` are deleted. `wrangler dev` runs it locally against the local Supabase + the real OpenAI Assistants API.

**Tech Stack:** Cloudflare Workers, Hono, `hono/streaming`, `openai` (Assistants, unchanged), the `shopulse-data` package from Track A, wrangler.

---

## Why keep Assistants API here

Spec §6.2: isolate "does Workers SSE + Supabase work" from "does Responses API work." The Assistants API is HTTP/fetch-based and runs on Workers fine. Track C swaps it once this runtime is proven. This means `worker/` temporarily imports `data/` for products/users **and** still calls OpenAI Assistants for chat threads — the chat thread registry moves to Supabase `conversations` (Track A schema) but the message content still lives in OpenAI threads until Track C.

> **Caveat the executor must respect:** the chat handler needs a real `OPENAI_API_KEY` + `OPENAI_ASSISTANT_ID` to run end-to-end. The products/user routes need only Supabase. If OpenAI creds are absent, build + verify the products/user routes and the SSE plumbing with a stub run, and mark the live chat verification as pending creds.

## File Structure

- `worker/package.json` — Hono + openai + `shopulse-data` (file: dep) + wrangler.
- `worker/wrangler.toml` — config, `nodejs_compat`, vars/secrets, observability.
- `worker/.dev.vars` — local secrets (gitignored): OPENAI_API_KEY, OPENAI_ASSISTANT_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
- `worker/src/index.js` — Hono app, CORS, route mounting.
- `worker/src/env.js` — typed env access + memoized clients (Supabase, OpenAI).
- `worker/src/routes/products.js` — `/search`, `/filter`, `/:id`, `/:id/reviews`.
- `worker/src/routes/users.js` — `/`, `/statistic`, POST `/`.
- `worker/src/routes/chat.js` — thread CRUD + `POST /messages` (streamSSE).
- `worker/src/chat/assistants.js` — Assistants API helpers (add/run/poll/submit), unchanged logic.
- `worker/src/chat/toolRunner.js` — tool calls via DIRECT data-function calls + the splitToolResults strip/reattach.
- `worker/test/*.test.js` — vitest + Hono `app.request()` for route shape; SSE frame test.

---

### Task 1: Scaffold `worker/`

**Files:** Create `worker/package.json`, `worker/wrangler.toml`, `worker/.dev.vars.example`; modify `.gitignore`.

- [ ] **Step 1:** `worker/package.json`:

```json
{
  "name": "shopulse-worker",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run"
  },
  "dependencies": {
    "hono": "^4.6.0",
    "openai": "^4.85.1",
    "shopulse-data": "file:../data"
  },
  "devDependencies": {
    "wrangler": "^3.80.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2:** `worker/wrangler.toml`:

```toml
name = "shopulse-api"
main = "src/index.js"
compatibility_date = "2026-01-01"
compatibility_flags = ["nodejs_compat"]

[observability]
enabled = true
```

- [ ] **Step 3:** `worker/.dev.vars.example`:

```
OPENAI_API_KEY=
OPENAI_ASSISTANT_ID=
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 4:** Append to `.gitignore`: `worker/.dev.vars`, `worker/node_modules`, `worker/.wrangler`.

- [ ] **Step 5:** `cd worker && npm install`. Expected: installs, `shopulse-data` linked from `../data`.

- [ ] **Step 6:** Commit.

---

### Task 2: env + client memoization

**Files:** Create `worker/src/env.js`.

- [ ] **Step 1:** Write `worker/src/env.js`:

```js
import { makeClient } from 'shopulse-data/src/supabaseClient.js';
import OpenAI from 'openai';

// Per-isolate memo. c.env carries wrangler vars/secrets.
let _sb, _oa;
export function supa(env) {
  if (!_sb) _sb = makeClient({ SUPABASE_URL: env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY });
  return _sb;
}
export function openai(env) {
  if (!_oa) _oa = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return _oa;
}
```

- [ ] **Step 2:** Commit.

---

### Task 3: products + users routes

**Files:** Create `worker/src/routes/products.js`, `worker/src/routes/users.js`.

- [ ] **Step 1:** `worker/src/routes/products.js`:

```js
import { Hono } from 'hono';
import { searchProducts, getProductDetails, getProductReviews } from 'shopulse-data/src/products.js';
import { supa } from '../env.js';

export const products = new Hono();

products.get('/search', async (c) => {
  const q = c.req.query();
  if (!q.keyword) return c.json({ error: 'Missing parameter: keyword is required.' }, 400);
  return c.json(await searchProducts(supa(c.env), q));
});

products.get('/filter', async (c) => c.json(await searchProducts(supa(c.env), c.req.query())));

products.get('/:productId', async (c) => {
  const excludeReview = c.req.query('excludeReview') === 'true';
  const d = await getProductDetails(supa(c.env), c.req.param('productId'), { excludeReview });
  return d ? c.json(d) : c.json({ error: 'Not Found' }, 404);
});

products.get('/:productId/reviews', async (c) => {
  const r = await getProductReviews(supa(c.env), c.req.param('productId'));
  return r ? c.json(r) : c.json({ error: 'Not Found' }, 404);
});
```

- [ ] **Step 2:** `worker/src/routes/users.js`:

```js
import { Hono } from 'hono';
import { getUser, createUser, getThreadsForUser } from 'shopulse-data/src/users.js';
import { supa } from '../env.js';

export const users = new Hono();

users.get('/', async (c) => {
  const u = await getUser(supa(c.env), c.req.query('userId'));
  return u ? c.json({ message: 'User found' }) : c.json({ error: 'User not found' }, 404);
});

users.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const id = body.userId || undefined;
  const u = await createUser(supa(c.env), id ?? cryptoRandomId());
  return c.json({ userId: u.id, message: 'User created successfully' }, 201);
});

function cryptoRandomId() {
  // 8-char short id, matching the old short-unique-id scheme closely enough
  return [...crypto.getRandomValues(new Uint8Array(6))].map((b) => b.toString(36)).join('').slice(0, 8);
}
```

- [ ] **Step 3:** Commit.

---

### Task 4: chat tool runner (direct calls + strip/reattach)

**Files:** Create `worker/src/chat/toolRunner.js`.

> This reuses the exact strip/reattach metadata logic from the old `chat.js`, but the tool calls hit the `data/` functions DIRECTLY (no localhost HTTP). Output shape feeds the Assistants `submit_tool_outputs` and produces the flat metadata for the message row.

- [ ] **Step 1:** Write `worker/src/chat/toolRunner.js` (full strip/reattach — see old chat.js lines 354-531 for parity):

```js
import { searchProducts, getProductDetails, getProductReviews } from 'shopulse-data/src/products.js';

export async function runToolCalls(sb, toolCalls) {
  const results = [];
  for (const tc of toolCalls) {
    if (tc.type !== 'function') continue;
    const name = tc.function.name;
    const args = JSON.parse(tc.function.arguments);
    let output;
    if (name === 'filter_products') {
      output = await searchProducts(sb, { ...args, limit: 3 });
      output.forEach((p) => delete p.productShortSpec);
    } else if (name === 'get_product_details') {
      output = await getProductDetails(sb, args.productId, { excludeReview: true });
      if (output) { delete output.productShortSpec; delete output.productDetail; }
    } else if (name === 'get_product_reviews') {
      output = await getProductReviews(sb, args.productId);
      output?.productReview?.reviewList?.forEach((r) => { r.review = (r.review || '').substring(0, 850); });
    }
    results.push({ tool_call_id: tc.id, tool_call_name: name, output });
  }
  return results;
}

// Splits raw tool results into (a) model-facing outputs (images stripped) and
// (b) flat metadata for the message row — the exact keys Threads.jsx parses.
export function splitToolResults(rawResults) {
  const modelOutputs = [];
  let metadata = {};
  for (const r of rawResults) {
    const name = r.tool_call_name;
    const out = r.output;
    let modelOut = structuredClone(out);
    if (name === 'filter_products' && Array.isArray(modelOut)) {
      modelOut = modelOut.map((p) => { delete p.productImageList; return p; });
    } else if (modelOut) {
      delete modelOut.productImageList;
      if (modelOut.productReview) modelOut.productReview = modelOut.productReview.reviewList;
    }
    modelOutputs.push({ tool_call_id: r.tool_call_id, output: JSON.stringify(modelOut) });

    if (name === 'filter_products' && Array.isArray(out)) {
      const noResult = out[0]?.noResult;
      if (out[0]?.filteringCondition) metadata.filtering_condition = JSON.stringify(out[0].filteringCondition);
      if (!noResult) {
        chunkImages(metadata, out.map((p) => p.productImageList?.[0]).filter(Boolean));
        metadata.product_name_list = JSON.stringify(out.map((p) => (p.productName || '').slice(0, 70)));
        metadata.product_id_list = JSON.stringify(out.map((p) => p._id));
        metadata.product_price_list = JSON.stringify(out.map((p) => p.productPrice));
        metadata.product_rating_list = JSON.stringify(out.map((p) => p.productRating));
        metadata.product_review_count_list = JSON.stringify(out.map((p) => p.productReviewCount));
      }
      metadata.tool_call_name = 'filter_products';
    }
    if (name === 'get_product_details' && out) {
      chunkImages(metadata, out.productImageList || []);
      metadata.product_name_list = JSON.stringify([out.productName]);
      metadata.tool_call_name = 'get_product_details';
    }
    if (name === 'get_product_reviews' && out) {
      const review = { ...out.productReview };
      delete review.reviewList;
      review.ratingDistributionList = (review.ratingDistributionList || []).map(({ id, ...rest }) => rest);
      metadata.product_review = JSON.stringify(review);
      metadata.tool_call_name = 'get_product_reviews';
    }
  }
  return { modelOutputs, metadata };
}

function chunkImages(metadata, imgs) {
  for (let i = 0; i < imgs.length; i += 5) {
    metadata[`img_list_${Math.floor(i / 5) + 1}`] = JSON.stringify(imgs.slice(i, i + 5));
  }
}
```

- [ ] **Step 2:** Commit.

---

### Task 5: Assistants helpers (unchanged logic, env-threaded)

**Files:** Create `worker/src/chat/assistants.js`.

- [ ] **Step 1:** Write the thin Assistants wrappers (`addMessage`, `runMessage`, `checkRunStatus`, `submitToolOutputs`, `getMessages`) — identical to old chat.js but taking an `openai` client argument. (Full code: copy from `backend/routes/chat.js` utility functions, replacing the module-level `openai` with a passed client.)

- [ ] **Step 2:** Commit.

---

### Task 6: chat route with streamSSE

**Files:** Create `worker/src/routes/chat.js`.

> The POST streams. No `GET /chat`, no connection Map. Thread registry in Supabase `conversations`; message content still in OpenAI threads (Track C moves it). Keep-alive ping every 20s. Hard ~80s wall-clock abort.

- [ ] **Step 1:** Write `worker/src/routes/chat.js` — thread CRUD via `data/users.js` thread functions (storing `openai_thread_id`), and `POST /messages` using `streamSSE` that: adds message → run → poll loop emitting `runStatus` → on `requires_action` run tools (direct) + submit → on completed emit `messages` frame. (Full code follows the streamSSE pattern from the spec §4.3.)

- [ ] **Step 2:** Commit.

---

### Task 7: index + CORS

**Files:** Create `worker/src/index.js`.

- [ ] **Step 1:** Write `worker/src/index.js`:

```js
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { products } from './routes/products.js';
import { users } from './routes/users.js';
import { chat } from './routes/chat.js';

const ALLOWED = ['http://localhost:5173', 'https://www.shopulse.xyz', 'https://shopulse.xyz'];

const app = new Hono();
app.use('*', cors({
  origin: (o) => (ALLOWED.includes(o) || /\.pages\.dev$/.test(o || '') ? o : ''),
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  maxAge: 86400,
}));
app.get('/', (c) => c.text('shopulse-api ok'));
app.route('/products', products);
app.route('/user', users);
app.route('/chat', chat);

export default app;
```

- [ ] **Step 2:** Commit.

---

### Task 8: route tests (Hono app.request)

**Files:** Create `worker/test/routes.test.js`.

- [ ] **Step 1:** Tests using `app.request('/products/search?keyword=oled')` against local Supabase: assert 200 + array; assert `/user` 404 for missing; assert CORS preflight reflects localhost origin. (SSE chat test stubbed if no OpenAI creds.)

- [ ] **Step 2:** Run `npm test`. Expected: PASS.

- [ ] **Step 3:** Commit.

---

### Task 9: wrangler dev smoke + frontend shim note

- [ ] **Step 1:** `wrangler dev` (needs `.dev.vars`). Curl `/products/search?keyword=oled&limit=2` → 200 array.
- [ ] **Step 2:** Document the frontend transport change for Track D: `POST /chat/messages` is now the SSE stream (replaces EventSource GET). Old React can be shimmed; Svelte (Track D) implements the fetch-stream reader.
- [ ] **Step 3:** Commit.

---

## Self-review notes

- Covers spec §4.3 (single Hono Worker, streamSSE on POST, direct data calls, CORS, secrets, no DynamoDB/DO) and §6.2 step 2 (keep Assistants).
- Chat message content stays in OpenAI threads this track; Supabase `conversations` holds the registry + `openai_thread_id`. Track C migrates content + statistics to Supabase.
- Tasks 5/6 reference "copy from old chat.js" for the bulkier verbatim logic rather than re-pasting 200 lines — the source is in-repo at `backend/routes/chat.js` and the transformation (thread `openai` client param, streamSSE emit points) is fully specified.
