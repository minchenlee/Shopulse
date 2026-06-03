import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import {
  getUser,
  createUser,
  getThreadsForUser,
  createThread,
  deleteThread,
  touchThreadByOpenaiId,
} from 'shopulse-data/src/users.js';
import { supa, openai } from '../env.js';
import {
  addMessageToThread,
  runMessage,
  checkRunStatus,
  submitToolOutputs,
  getMessages,
} from '../chat/assistants.js';
import { runToolCalls, splitToolResults } from '../chat/toolRunner.js';

export const chat = new Hono();

const MAX_THREADS = 3;
const POLL_INTERVAL_MS = 3000; // old chat.js used a 3s poll delay
const PING_INTERVAL_MS = 20000; // CF tears down an idle stream ~100s; ping at 20s
const WALL_CLOCK_BUDGET_MS = 80000; // hard abort before the ~100s CF edge kill (spec §4.2)

// Find the conversation row whose openai_thread_id matches the OpenAI thread the
// frontend keys off. The frontend works in OpenAI thread ids this track, so every
// inbound threadId is an openai_thread_id and we translate to the conversation row
// only where Supabase needs the row id (delete / touch).
function findConversation(rows, openaiThreadId) {
  return rows.find((r) => r.openai_thread_id === openaiThreadId) ?? null;
}

// GET /chat/threads — list conversations for a user.
chat.get('/threads', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) return c.json({ error: 'User ID is required' }, 400);

  try {
    const threads = await getThreadsForUser(supa(c.env), userId);
    return c.json({ threads });
  } catch (err) {
    console.error('Failed to retrieve chat threads:', err?.message);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// POST /chat/threads — create a conversation (max 3), backed by a fresh OpenAI thread.
chat.post('/threads', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const userId = body.userId;
  if (!userId) return c.json({ error: 'User ID is required' }, 400);

  try {
    const sb = supa(c.env);

    // ensure the user exists (old chat.js did this via a localhost round-trip)
    const user = await getUser(sb, userId);
    if (!user) await createUser(sb, userId);

    // enforce max-3 before creating anything
    const threads = await getThreadsForUser(sb, userId);
    if (threads.length >= MAX_THREADS) {
      return c.json({ error: 'Maximum number of threads reached: max 3 threads per user' }, 400);
    }

    // create the OpenAI thread first, then record it in the conversations registry
    const oaThread = await openai(c.env).beta.threads.create();
    await createThread(sb, userId, { openaiThreadId: oaThread.id });

    // frontend keys off the OpenAI thread id this track
    return c.json({ threadId: `${oaThread.id}` });
  } catch (err) {
    console.error('Failed to create thread:', err?.message);
    return c.json({ error: 'Failed to process request' }, 500);
  }
});

// DELETE /chat/threads — remove the conversation row AND the OpenAI thread.
chat.delete('/threads', async (c) => {
  const userId = c.req.query('userId');
  const threadId = c.req.query('threadId'); // openai_thread_id
  if (!userId || !threadId) return c.json({ error: 'Missing userId or threadId' }, 400);

  try {
    const sb = supa(c.env);
    const rows = await getThreadsForUser(sb, userId);
    const conv = findConversation(rows, threadId);
    if (conv) await deleteThread(sb, userId, conv.id);
    await openai(c.env).beta.threads.del(threadId);
    return c.json({ success: true, message: `Thread ${threadId} deleted successfully` });
  } catch (err) {
    console.error('Failed to delete thread:', err?.message);
    return c.json({ error: 'Failed to delete thread' }, 500);
  }
});

// GET /chat/threads/messages — fetch + reverse + flatten the OpenAI messages for a thread.
chat.get('/threads/messages', async (c) => {
  const threadId = c.req.query('threadId');
  const simple = c.req.query('simple');
  if (!threadId) return c.json({ error: 'Missing threadId' }, 400);

  try {
    const rawMessages = await getMessages(openai(c.env), threadId);
    let dataList = rawMessages.data;
    // reverse so the latest message is at the bottom (matches old chat.js)
    dataList.reverse();

    const convertToISO = (timestamp) => new Date(timestamp * 1000).toISOString();

    dataList.forEach((data) => {
      data.content = data.content[0].text.value;
      data.created_at = convertToISO(data.created_at);
    });

    if (simple) {
      dataList = dataList.map((data) => ({
        id: data.id,
        role: data.role,
        content: data.content,
        metadata: data.metadata,
      }));
    }

    return c.json(dataList);
  } catch (err) {
    console.error('Failed to retrieve messages:', err?.message);
    return c.json({ error: 'Failed to retrieve messages' }, 500);
  }
});

// POST /chat/messages — THE streaming handler.
// Streams the POST: emits `runStatus` frames on each status change, then a single
// final `messages` frame on its own body. Keep-alive `:ping` every ~20s; hard ~80s
// wall-clock abort emitting `{type:'error'}`. Never throws out of the stream.
chat.post('/messages', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { threadId, message } = body;

  if (!threadId || !message) {
    return c.json({ error: 'Missing threadId or message' }, 400);
  }

  const oa = openai(c.env);
  const sb = supa(c.env);
  const assistantId = c.env.OPENAI_ASSISTANT_ID;

  return streamSSE(c, async (stream) => {
    // raw SSE comment frame so CF doesn't tear down the idle stream
    const ping = setInterval(() => {
      stream.write(': ping\n\n').catch(() => {});
    }, PING_INTERVAL_MS);

    // helper: emit a frame whose JSON payload carries the frontend `type`, and mirror
    // it on the SSE `event` field. Frontend reads the JSON payload's `type`.
    const emit = (type, data) => stream.writeSSE({ event: type, data: JSON.stringify({ type, data }) });

    const startedAt = Date.now();
    const budgetExceeded = () => Date.now() - startedAt > WALL_CLOCK_BUDGET_MS;

    try {
      await addMessageToThread(oa, threadId, message);
      let run = await runMessage(oa, threadId, assistantId);
      await emit('runStatus', run);

      let previousStatus = run.status;
      // metadata accumulated from the tool calls of this run, reattached to the
      // latest assistant message on the final `messages` frame.
      let metadata = {};

      // poll loop — no maxAttempts cap, but a hard wall-clock budget (spec §4.2)
      while (run.status !== 'completed' && run.status !== 'failed') {
        // HARD ~80s wall-clock abort: don't hang until the ~100s CF edge kill.
        if (budgetExceeded()) {
          await emit('error', { message: `Processing timed out for thread ${threadId}` });
          return;
        }

        await stream.sleep(POLL_INTERVAL_MS);
        run = await checkRunStatus(oa, threadId, run.id);

        if (run.status !== previousStatus) {
          await emit('runStatus', run);
          previousStatus = run.status;
        }

        if (run.status === 'requires_action') {
          const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
          const rawResults = await runToolCalls(sb, toolCalls);
          const { modelOutputs, metadata: runMetadata } = splitToolResults(rawResults);
          metadata = { ...metadata, ...runMetadata };
          run = await submitToolOutputs(oa, threadId, run.id, modelOutputs);
          previousStatus = run.status;
        }
      }

      if (run.status === 'completed') {
        // POST /messages only knows the OpenAI thread id (no conversation row id, no userId
        // in its body), so bump last_active keyed on openai_thread_id.
        await touchThreadByOpenaiId(sb, threadId);
        const messages = await getMessages(oa, threadId);

        // Reattach the product metadata to the latest assistant message. Old chat.js
        // wrote it back to OpenAI via modifyMessage; here it rides the `messages` frame's
        // per-message `metadata` (frontend reads message.metadata). messages.data[0] is
        // the newest message (unreversed list, newest first).
        if (Object.keys(metadata).length > 0) {
          const latest = messages.data[0];
          if (latest) latest.metadata = { ...(latest.metadata || {}), ...metadata };
        }

        await emit('messages', messages);
      } else {
        // failed or otherwise incomplete
        await emit('error', { message: `Processing incomplete for thread ${threadId}: Status ${run.status}` });
      }
    } catch (err) {
      console.error('Failed to process message:', err?.message);
      // never throw out of the stream — emit a terminal error frame instead
      await emit('error', { message: 'Failed to process message' });
    } finally {
      clearInterval(ping);
    }
  });
});
