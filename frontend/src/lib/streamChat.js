// lib/streamChat.js
//
// L1.2 — THE transport rewrite (risk R1, the single most important change).
//
// The old React app opened an `EventSource` GET on `/chat?threadId=…`
// (UserSessionContext.jsx:188) and, per `onmessage`, did EXACTLY:
//
//     const data = JSON.parse(event.data);   // the frame payload { type, data }
//     setCurrentEvent(data);                 // (1) ALWAYS, for every frame
//     if (data.type === 'messages' || data.type === 'confirmation')
//       setCurrentMessages(data);            // (2) the messages frame
//     if (data.type === 'runStatus')
//       setMessageStatus(data.data.status);  // (3) the status frame
//
// That GET endpoint is DELETED backend-side. The live transport is now a
// POST `/chat/messages` whose response body IS the SSE stream (Track C worker
// chat.js:166-240). This module reads that stream and invokes callbacks in the
// SAME order the EventSource did, so the store transitions are byte-for-byte
// equivalent — otherwise the spinner, status label and auto-open-buffer break.
//
// Wire format (Hono streamSSE, worker chat.js:186):
//   - each frame is `event: <type>\ndata: <json>\n\n`
//   - the JSON payload is `{ type, data }` (frontend reads the JSON `type`, not
//     the SSE `event:` line — faithful to the old EventSource which only saw
//     `event.data`)
//   - keep-alive comment frames are `: ping\n\n` (chat.js:181) — ignored
//
// Frame sequence for a normal turn: runStatus(in_progress) → runStatus(completed)
//   → messages{ data:{ data:[…newest-first…] } }.  On budget/abort: error{message}.
//
// No reconnect: the old EventSource had none (it only `.close()`d on error). This
// is a faithful port — a dropped stream is not retried.

/**
 * Stream a chat turn over POST /chat/messages and drive store transitions.
 *
 * @param {object}   opts
 * @param {string}   opts.baseURL            - VITE_API_BASE_URL.
 * @param {string}   opts.threadId           - conversation UUID.
 * @param {string}   opts.message            - the user's message text.
 * @param {(payload:object)=>void} [opts.onEvent]
 *        Called for EVERY parsed frame, FIRST (mirrors `setCurrentEvent` — the
 *        old onmessage's unconditional first step). Receives the full `{type,data}`.
 * @param {(status:string)=>void}  [opts.onRunStatus]
 *        Called for `runStatus` frames with `data.data.status` (mirrors
 *        `setMessageStatus(data.data.status)`).
 * @param {(payload:object)=>void} [opts.onMessages]
 *        Called for `messages` (and `confirmation`) frames with the full payload
 *        `{ type, data:{ data:[…] } }` (mirrors `setCurrentMessages(data)` — so
 *        `currentMessages.data.data` resolves to the newest-first array, R2).
 * @param {(error:any)=>void}      [opts.onError]
 *        Called on a transport failure OR a terminal `error` frame from the worker.
 * @param {AbortSignal} [opts.signal]        - optional abort (none in the old code).
 * @returns {Promise<void>} resolves when the stream ends.
 */
export async function streamChat({
  baseURL,
  threadId,
  message,
  onEvent,
  onRunStatus,
  onMessages,
  onError,
  signal,
}) {
  let response;
  try {
    response = await fetch(baseURL + '/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, message }),
      signal,
    });
  } catch (err) {
    // network-level failure before the stream opens — mirror eventSource.onerror.
    onError?.(err);
    return;
  }

  if (!response.ok || !response.body) {
    onError?.(new Error(`Stream request failed: ${response.status}`));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    // Read the byte stream, accumulating into `buffer`, and split on the SSE
    // record separator `\n\n`. A partial trailing record stays in the buffer.
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let sepIndex;
      while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
        const rawFrame = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);
        dispatchFrame(rawFrame);
      }
    }

    // flush any final record without a trailing blank line
    const tail = buffer.trim();
    if (tail) dispatchFrame(tail);
  } catch (err) {
    onError?.(err);
  }

  // Parse one SSE record (which may span multiple `event:`/`data:` lines) and
  // invoke the callbacks in the EventSource order: onEvent first, then the typed one.
  function dispatchFrame(rawFrame) {
    // Collect the `data:` line(s); ignore comment frames (`:ping`) and the
    // `event:` line (the frontend reads the JSON payload's `type`, not the event field).
    const dataLines = [];
    for (const line of rawFrame.split('\n')) {
      if (line.startsWith(':')) continue; // comment / keep-alive (`: ping`)
      if (line.startsWith('data:')) {
        // SSE: strip `data:` and an optional single leading space.
        dataLines.push(line.slice(5).replace(/^ /, ''));
      }
      // other fields (event:, id:, retry:) are not consumed — faithful to onmessage.
    }
    if (dataLines.length === 0) return;

    let payload;
    try {
      payload = JSON.parse(dataLines.join('\n'));
    } catch {
      return; // not JSON — skip (defensive; the worker only emits JSON data frames)
    }

    // (1) ALWAYS first — mirrors `setCurrentEvent(data)`.
    onEvent?.(payload);

    // (2) messages / confirmation — mirrors `setCurrentMessages(data)`.
    if (payload.type === 'messages' || payload.type === 'confirmation') {
      onMessages?.(payload);
    }

    // (3) runStatus — mirrors `setMessageStatus(data.data.status)`.
    if (payload.type === 'runStatus') {
      onRunStatus?.(payload.data.status);
    }

    // terminal error frame from the worker (budget/abort, chat.js:213/230/234).
    // The old EventSource had no app-level error frame (errors were transport-level
    // → onerror), so this is the new transport's equivalent of onerror.
    if (payload.type === 'error') {
      onError?.(payload.data);
    }
  }
}
