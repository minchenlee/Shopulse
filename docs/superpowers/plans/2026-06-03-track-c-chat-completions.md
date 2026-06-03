# Track C — Chat Completions (Groq) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Replace Track B's OpenAI **Assistants** chat path with an OpenAI-compatible **Chat Completions** tool loop running on **Groq** (free tier), so chat works despite the OpenAI account being out of quota. Keep the `streamSSE` plumbing, keep-alive, ~80s abort, and `splitToolResults` strip/reattach from Track B. The conversation UNIT becomes the Supabase `conversations` row (its UUID); message CONTENT moves into Supabase `messages` (no OpenAI threads). The frontend is untouched this track — same SSE frame contract, same `messages.metadata` keys.

> **SUPERSEDES spec §4.2's "Responses API" choice.** Owner decision: re-target to Chat Completions on Groq (OpenAI-proprietary Assistants/Responses are unusable on a quota-dead account). Everything else in §4.2 (strip/reattach, statistics-as-SQL, ~80s abort) still holds.

---

## Verified facts (live probes, 2026-06-03)

These are confirmed, not assumed — do not re-litigate them:

1. **`GROQ_API_KEY` is present** in `worker/.dev.vars` (prefix `gsk_tj…`). Groq `GET /openai/v1/models` succeeds.
2. **Model: `llama-3.3-70b-versatile`.** Live `chat.completions.create` with the real `TOOLS` + `SYSTEM_PROMPT` emitted a `filter_products` tool call (`finish_reason: "tool_calls"`), the real `searchProducts` returned 3 products, the `role:'tool'` result fed back produced a 1358-char final answer (`finish_reason: "stop"`) with **no image URLs leaked into model text**. The whole target control flow works on Groq. (gpt-oss-120b, llama-4-scout, qwen3-32b, llama-3.1-8b-instant also pass tool calling — fallbacks.)
3. **GROQ GOTCHA — no JSON-schema `enum`.** A tool param with `enum` triggers Groq HTTP 400 `"Failed to call a function"`. The retrieved Assistant tool defs use **no enums** (allowed values are described in `description` text) — keep it that way. `src/llm/tools.js` already obeys this.
4. **Instructions RETRIEVED verbatim** (not reconstructed). `openai.beta.assistants.retrieve(OPENAI_ASSISTANT_ID)` SUCCEEDED — the OpenAI account permits GET/retrieve; only generation is quota-blocked. `.instructions` → `src/llm/systemPrompt.js`; `.tools` (already Chat-Completions nested shape) → `src/llm/tools.js`. Model was `gpt-4o-mini`, name "Thesis". Both files are WRITTEN as part of the design step.
5. **Response id format:** Groq returns `chatcmpl-<uuid>`. Persist the FINAL turn's id into `messages.response_id` (and optionally `conversations.last_response_id` — informational only; we do NOT chain on it, history is rebuilt from Supabase rows each turn).
6. **Frontend frame contract (must stay identical):** `UserSessionContext.jsx` reads `data.type` (`runStatus` | `messages`) and stores the payload; `setMessageStatus(data.data.status)` for `runStatus`. `Threads.jsx` reads `currentMessages.data.data` (an array, newest-first), reverses it, and per message reads `message.role`, **`message.content[0].text.value`**, `message.metadata` (flat blob: `tool_call_name`, `product_review`, `img_list_N`, `product_*_list`, `filtering_condition`), and `latestMessage = currentMessages.data.data[0]` (newest first) for `metadata.tool_call_name`. **So the `messages` SSE frame payload must be shaped `{ data: [ {id, role, content:[{type:'text',text:{value}}], metadata, created_at}, … ] }`, newest-first.** Track C builds this from Supabase rows.

---

## Files (this track)

- `data/src/messages.js` — **NEW** Supabase `messages` helpers: `insertMessage`, `getMessagesForConversation`. (Track A added `conversations` helpers in `users.js` but no `messages` table helpers.)
- `data/sql/conversation_statistics.sql` — **REUSE as-is** (already written; one `rpc('conversation_statistics',{p_cid})` call). Do NOT recompute stats in JS.
- `worker/src/llm/systemPrompt.js` — **DONE (design step)** verbatim system prompt.
- `worker/src/llm/tools.js` — **DONE (design step)** Chat Completions nested tool defs, enum-free.
- `worker/src/chat/completions.js` — **NEW** the Chat Completions stream tool loop (replaces `assistants.js` as the engine; `assistants.js` is deleted).
- `worker/src/chat/toolRunner.js` — **REUSE** `runToolCalls` + `splitToolResults` unchanged; only the *consumer* changes (tool results become `role:'tool'` messages, not `submit_tool_outputs`).
- `worker/src/routes/chat.js` — **REWRITE** thread CRUD + `POST /messages` to the Chat Completions loop against Supabase rows; `GET /threads/messages` and `GET /threads/statistics` read Supabase.
- `worker/src/env.js` — **MODIFY** `openai(env)` to target Groq base URL + `GROQ_API_KEY`.
- `worker/.dev.vars` — `GROQ_API_KEY` present; add `OPENAI_BASE_URL` + `OPENAI_MODEL` (optional, have defaults).
- `worker/src/chat/assistants.js` — **DELETE** (Assistants engine retired).
- `worker/test/chat.test.js` — frame-shape + loop tests.

> **data/ copy gotcha:** `worker` depends on `data/` via `file:../data` which npm **copies, not symlinks**. After ANY `data/src` edit:
> `rm -rf worker/node_modules/shopulse-data && (cd worker && npm install)`

---

## Target control flow (POST /chat/messages)

```
insert user message row (role:'user', content:message)
  → messages = [ {system}, ...history(prior Supabase rows mapped to {role,content}), {user:message} ]
  → loop:
      stream = openai.chat.completions.create({ model, messages, tools, stream:true })
      accumulate delta.content (+ stream as we go is OPTIONAL; frontend only needs the final frame)
      accumulate delta.tool_calls by index (id/name/arguments are chunked — concatenate)
      capture finish_reason + chunk.id (response id)
      if finish_reason === 'tool_calls':
          rawResults = runToolCalls(sb, accumulatedToolCalls)        // DIRECT data calls
          { modelOutputs, metadata } = splitToolResults(rawResults)  // accumulate metadata across turns
          messages.push({ role:'assistant', content: accContent || null, tool_calls: accumulatedToolCalls })
          for each modelOutput: messages.push({ role:'tool', tool_call_id, content: JSON.stringify(output) })
          continue loop
      else (finish_reason === 'stop'):
          persist assistant row: content=accContent, metadata=accMetadata,
                                 tool_call_name=accMetadata.tool_call_name ?? null,
                                 response_id=lastResponseId
          touchThread(sb, conversationId)
          emit('messages', buildMessagesFrame(sb rows))   // newest-first, content[0].text.value shape
          return
```

- `runStatus` frames: Track B emitted the Assistants run object. Chat Completions has no run object — emit a minimal synthetic frame the frontend's `setMessageStatus(data.data.status)` accepts: `emit('runStatus', { status: 'in_progress' })` at start, and the terminal state is conveyed by the `messages` frame (frontend sets `isLoading=false` on `currentEvent.type === 'messages'`). Emit `{status:'queued'}`→`{status:'in_progress'}`→ (tools) `{status:'requires_action'}` to mirror the old status strings if the frontend gates on specific values — **verify which status strings `Threads.jsx`/`UserSessionContext.jsx` actually branch on before minimizing.**
- Keep-alive `:ping` every ~20s; hard ~80s wall-clock abort emitting `{type:'error'}`. **GUARD THE COMPLETION TAIL** (Track B review flagged the tail unguarded): the persist + final emit must run only if NOT already aborted, and a budget check must wrap each loop iteration AND the tail so a slow final turn can't emit after the abort frame.
- **`tool_call_id` correlation:** Groq tool-call ids are short (e.g. `d2p2bp2yr`). `runToolCalls` already returns `{tool_call_id}`; ensure each `role:'tool'` message uses the SAME id the model emitted, in the same order.

---

### Task 1: Data layer — Supabase `messages` helpers

**Files:** Create `data/src/messages.js`.

- [ ] **Step 1:** `insertMessage(supabase, { conversationId, role, content, toolCallName = null, metadata = {}, responseId = null })` → insert into `messages`, `.select().single()`, return the row. Columns per `data/sql/schema.sql`: `conversation_id`, `role` (`'user'|'assistant'`), `content` (text, default ''), `tool_call_name`, `metadata` (jsonb), `response_id`, `created_at` (default now()).
  - Verify: `role` check constraint only allows `user`/`assistant` — we never insert `tool`/`system` rows (those live only in the in-memory `messages` array sent to the model).
- [ ] **Step 2:** `getMessagesForConversation(supabase, conversationId)` → `select('*').eq('conversation_id', cid).order('created_at', { ascending: true })` → return rows ascending (oldest first). The history builder uses ascending; the SSE frame builder reverses to newest-first.
- [ ] **Step 3:** After editing `data/src`, run the copy-gotcha resync: `rm -rf worker/node_modules/shopulse-data && (cd worker && npm install)`.
  - Verify: `node -e "import('shopulse-data/src/messages.js').then(m=>console.log(Object.keys(m)))"` from `worker/` lists both exports.

### Task 2: env — point the OpenAI client at Groq

**Files:** Modify `worker/src/env.js`, `worker/.dev.vars`.

- [ ] **Step 1:** Change `openai(env)` to:
  ```js
  export function openai(env) {
    if (!_oa) _oa = new OpenAI({
      apiKey: env.GROQ_API_KEY || env.OPENAI_API_KEY,
      baseURL: env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1',
    });
    return _oa;
  }
  ```
  Add an exported `chatModel(env)` → `env.OPENAI_MODEL || 'llama-3.3-70b-versatile'`.
- [ ] **Step 2:** `worker/.dev.vars`: `GROQ_API_KEY` already set. Optionally add `OPENAI_BASE_URL` / `OPENAI_MODEL` (defaults cover them). Update `worker/.dev.vars.example` to document `GROQ_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`.
  - Verify: a tiny `wrangler dev` smoke or the standalone probe (`/tmp/groq_loop_probe.mjs` pattern) still returns a tool call.

### Task 3: Chat engine — `worker/src/chat/completions.js`

**Files:** Create `worker/src/chat/completions.js`.

- [ ] **Step 1:** `accumulateToolCalls(acc, deltaToolCalls)` — merge streamed `tool_calls` deltas by `index`: concatenate `function.name` and `function.arguments`, capture `id`. (Verified pattern: Groq sends id+name in the first delta and arguments across following deltas.)
- [ ] **Step 2:** `runOneTurn(openai, model, messages, tools)` — `chat.completions.create({ model, messages, tools, stream:true })`, iterate chunks, return `{ content, toolCalls, finishReason, responseId }`. `toolCalls` filtered to remove sparse holes. `responseId` = last seen `chunk.id`.
- [ ] **Step 3:** `buildHistory(rows)` — map ascending Supabase rows to `[{role, content}]`. Only `role` + `content` (Chat Completions plain turns). We do NOT replay tool_calls/tool messages from history — the model gets prior assistant TEXT only, which matches how the old Assistants thread replayed (the user never saw raw tool JSON). Prepend `{role:'system', content: SYSTEM_PROMPT}` and append the new `{role:'user', content: message}`.
- [ ] **Step 4:** `buildMessagesFrame(rows)` — map Supabase rows (fetch fresh after insert) to the frontend shape, **newest-first**: `{ data: rows.slice().reverse().map(r => ({ id:String(r.id), role:r.role, content:[{type:'text',text:{value:r.content}}], metadata:r.metadata ?? {}, created_at:r.created_at })) }`. This reproduces the OpenAI `messages.list` envelope `Threads.jsx` consumes (`content[0].text.value`, `data.data[0]` newest).
  - Verify against `Threads.jsx` line 47 (`currentMessages.data.data[0]`) and line 198 (`message.content[0].text.value`).

### Task 4: Routes — rewrite `worker/src/routes/chat.js`

**Files:** Rewrite `worker/src/routes/chat.js`; delete `worker/src/chat/assistants.js`.

- [ ] **Step 1: POST /chat/threads** — create the conversation row as the UNIT. Drop the `openai.beta.threads.create()` call (no OpenAI thread). `createThread(sb, userId, {})` → return `{ threadId: conversation.id }` (the UUID). Keep ensure-user + max-3 logic. `openai_thread_id` stays null.
- [ ] **Step 2: GET /chat/threads** — unchanged (`getThreadsForUser`).
- [ ] **Step 3: DELETE /chat/threads** — `threadId` is now the conversation UUID. `deleteThread(sb, userId, threadId)` (messages cascade via FK `on delete cascade`). **Remove** the `openai.beta.threads.del()` call. (`findConversation`-by-openai-id helper is deleted.)
- [ ] **Step 4: GET /chat/threads/messages** — read Supabase as source of truth: `getMessagesForConversation(sb, threadId)`, reverse to newest-first, map to `content[0].text.value` shape + ISO `created_at` (rows already store timestamptz; pass through as ISO string, no `*1000` conversion — that was OpenAI epoch-seconds). Honor `simple` query (id/role/content/metadata only). Return the **bare array** (old route returned `dataList` directly, not wrapped).
  - Verify: shape parity with old `backend/routes/chat.js` GET /threads/messages (array; each `content` already flattened to a string when `simple`, else `content[0].text.value` per the non-simple path — match Track B's existing behavior so the frontend history fetch is unchanged).
- [ ] **Step 5: GET /chat/threads/statistics** — NEW route (Track B didn't port it). `threadId` = conversation UUID. `const { data } = await sb.rpc('conversation_statistics', { p_cid: threadId })`; the RPC returns a single-row table → take `data[0]`. Map the snake_case RPC columns to the camelCase keys the old route returned (`messageCount`, `userMessageCount`, …, `avgAssistantResponseTime`) — see `backend/routes/chat.js` response object for the exact key set. 404 if no rows / message_count is 0.
  - Verify: key names match the old JSON response exactly (frontend statistics view depends on them).
- [ ] **Step 6: POST /chat/messages** — the streaming handler. `threadId` = conversation UUID, `message` = user text.
  - `streamSSE`: ping interval ~20s; `emit(type,data)` helper identical to Track B (writeSSE event+JSON payload).
  - `insertMessage(sb, { conversationId: threadId, role:'user', content: message })`.
  - Build `messages` = `[system, ...buildHistory(prior rows), {user}]`. (Fetch prior rows BEFORE inserting the user row, or fetch after and exclude/keep the just-inserted user row consistently — pick one; simplest: fetch history, then push the new user turn in-memory, AND persist the user row, so the array and the DB agree.)
  - Loop `runOneTurn`; on `tool_calls` run `runToolCalls` + `splitToolResults`, accumulate `metadata`, push assistant-with-tool_calls + `role:'tool'` results, continue. **Budget-check each iteration.**
  - On `stop`: **guarded tail** — if `budgetExceeded()` already fired, do nothing (abort frame already sent). Else `insertMessage(sb,{ conversationId:threadId, role:'assistant', content: finalContent, toolCallName: metadata.tool_call_name ?? null, metadata, responseId })` → `touchThread(sb, threadId)` → `emit('messages', buildMessagesFrame(freshRows))`.
  - `catch` → `emit('error', …)`; `finally` → `clearInterval(ping)`. Never throw out of the stream.
  - **Drop `touchThreadByOpenaiId`** (we have the conversation id directly) → use `touchThread`.
- [ ] **Step 7:** Delete `worker/src/chat/assistants.js` and remove its import. Remove now-orphaned imports in `chat.js` (`addMessageToThread/runMessage/checkRunStatus/submitToolOutputs/getMessages` from assistants, `touchThreadByOpenaiId`, `findConversation`).
  - Verify: `grep -rn "assistants.js\|beta.threads\|touchThreadByOpenaiId" worker/src` returns nothing.

### Task 5: Metadata parity (toolRunner reuse)

**Files:** none (reuse `worker/src/chat/toolRunner.js`).

- [ ] **Step 1:** Confirm `runToolCalls` input shape: it reads `tc.function.name`, `tc.function.arguments`, `tc.id`. Accumulated Chat Completions tool calls have exactly this shape — **no adapter needed**.
- [ ] **Step 2:** Confirm `splitToolResults` output: `modelOutputs` = `[{tool_call_id, output:JSON.string}]`. Feed each as a `role:'tool'` message: `{ role:'tool', tool_call_id: o.tool_call_id, content: o.output }`. `metadata` accumulates across turns and lands in the assistant row's `metadata` jsonb (exact frontend keys: `img_list_N`, `product_name_list`, `product_id_list`, `product_price_list`, `product_rating_list`, `product_review_count_list`, `filtering_condition`, `product_review`, `tool_call_name`). Empty-result `filter_products` still emits `filtering_condition` + `tool_call_name` (Track B already handles this).
  - Verify: a live run of `filter_products` writes `metadata.tool_call_name='filter_products'`, `metadata.filtering_condition`, `img_list_1`, and `product_*_list` keys into the assistant `messages` row.

### Task 6: Tests + live verification

**Files:** `worker/test/chat.test.js`.

- [ ] **Step 1:** Unit: `accumulateToolCalls` merges chunked deltas; `buildMessagesFrame` produces `content[0].text.value` + newest-first; `buildHistory` prepends system + maps roles.
- [ ] **Step 2:** Route shape (Hono `app.request`): POST /chat/threads returns `{threadId: <uuid>}`; GET /threads/messages returns an array; GET /threads/statistics maps RPC → camelCase (mock `sb.rpc`).
- [ ] **Step 3:** LIVE (creds present): `wrangler dev`, POST /chat/threads, then POST /chat/messages with `"find me an OLED TV under $2000"`, read the SSE stream, assert a final `messages` frame whose newest message has non-empty content and `metadata.tool_call_name === 'filter_products'`. Then GET /threads/statistics returns `messageCount >= 2`.
  - Verify: image URLs never appear in the assistant `content`; they DO appear in `metadata.img_list_1`.

---

## Done criteria

- [ ] `POST /chat/messages` runs the Groq Chat Completions tool loop end-to-end on `wrangler dev`, persists user + assistant rows to Supabase `messages`, and emits a final `messages` frame in the exact Track-B/frontend shape.
- [ ] `filter_products` / `get_product_details` / `get_product_reviews` all round-trip; metadata keys match the frontend contract; no image URLs leak into model text.
- [ ] `GET /threads/messages` and `GET /threads/statistics` read Supabase (RPC for stats — no JS recompute).
- [ ] ~20s ping + ~80s abort present; the completion tail is GUARDED against post-abort emission.
- [ ] `assistants.js` deleted; no `beta.threads` references remain; `openai_thread_id` stays null.
- [ ] streamSSE frame contract identical — frontend untouched this track.

## Out of scope (per owner)

- Thread export / historical data import — **skipped** (fresh start).
- `previous_response_id` / OpenAI Conversations chaining — not used; history rebuilds from Supabase rows each turn.
- Frontend changes — Track D.
