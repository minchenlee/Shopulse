import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import {
  getUser,
  createUser,
  getThreadsForUser,
  createThread,
  deleteThread,
  touchThread,
} from 'shopulse-data/src/users.js';
import { supa, openai, chatModel } from '../env.js';
import { runChatCompletion, BudgetError } from '../chat/completions.js';
import {
  insertUserMessage,
  insertAssistantMessage,
  listMessages,
  toHistory,
  getStatistics,
} from '../chat/messagesStore.js';
import { SYSTEM_PROMPT } from '../llm/systemPrompt.js';
import { TOOLS } from '../llm/tools.js';

export const chat = new Hono();

const MAX_THREADS = 3;
const PING_INTERVAL_MS = 20000; // CF tears down an idle stream ~100s; ping at 20s
const WALL_CLOCK_BUDGET_MS = 80000; // hard abort before the ~100s CF edge kill (spec §4.2)

// Shape Supabase message rows into the frame the frontend consumes: newest-first, each
// message's content flattened into the OpenAI-style { content:[{type:'text',text:{value}}] }
// envelope Threads.jsx reads (message.content[0].text.value, currentMessages.data.data[0]).
function buildMessagesFrame(rows) {
  return {
    data: rows
      .slice()
      .reverse()
      .map((r) => ({
        id: String(r.id),
        role: r.role,
        content: [{ type: 'text', text: { value: r.content } }],
        metadata: r.metadata ?? {},
        created_at: r.created_at,
      })),
  };
}

// GET /chat/threads — list conversations for a user.
// Shape raw `conversations` rows into the { threadId, updatedAt } envelope the frontend
// reads (session: threads[].threadId + sort/display by threads[].updatedAt). The old
// Mongo ThreadModel exposed `threadId` + timestamps `updatedAt`; Supabase rows carry
// `id` + `last_active`, so map them here (same row-shaping pattern as buildMessagesFrame).
function buildThreadsFrame(rows) {
  return rows.map((r) => ({
    threadId: String(r.id),
    updatedAt: r.last_active ?? r.created_at,
  }));
}

chat.get('/threads', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) return c.json({ error: 'User ID is required' }, 400);

  try {
    const threads = buildThreadsFrame(await getThreadsForUser(supa(c.env), userId));
    return c.json({ threads });
  } catch (err) {
    console.error('Failed to retrieve chat threads:', err?.message);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// POST /chat/threads — create a conversation (max 3). The conversation row IS the unit;
// no OpenAI thread is created (openai_thread_id stays null). The frontend keys off the
// returned conversation UUID.
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

    const conv = await createThread(sb, userId, {});
    return c.json({ threadId: `${conv.id}` });
  } catch (err) {
    console.error('Failed to create thread:', err?.message);
    return c.json({ error: 'Failed to process request' }, 500);
  }
});

// DELETE /chat/threads — remove the conversation row (messages cascade via FK).
chat.delete('/threads', async (c) => {
  const userId = c.req.query('userId');
  const threadId = c.req.query('threadId'); // conversation UUID
  if (!userId || !threadId) return c.json({ error: 'Missing userId or threadId' }, 400);

  try {
    await deleteThread(supa(c.env), userId, threadId);
    return c.json({ success: true, message: `Thread ${threadId} deleted successfully` });
  } catch (err) {
    console.error('Failed to delete thread:', err?.message);
    return c.json({ error: 'Failed to delete thread' }, 500);
  }
});

// GET /chat/threads/messages — read Supabase (source of truth), newest-first, flattened.
chat.get('/threads/messages', async (c) => {
  const threadId = c.req.query('threadId'); // conversation UUID
  const simple = c.req.query('simple');
  if (!threadId) return c.json({ error: 'Missing threadId' }, 400);

  try {
    const rows = await listMessages(supa(c.env), threadId);
    // newest-first to match the old route (which reversed an oldest-last OpenAI list)
    let dataList = rows
      .slice()
      .reverse()
      .map((r) => ({
        id: String(r.id),
        role: r.role,
        content: [{ type: 'text', text: { value: r.content } }],
        metadata: r.metadata ?? {},
        created_at: r.created_at, // already ISO from timestamptz
      }));

    // non-simple path flattens content to a string (old route's data.content = content[0]...)
    dataList.forEach((data) => {
      data.content = data.content[0].text.value;
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

// GET /chat/threads/statistics — conversation_statistics RPC (no JS recompute).
chat.get('/threads/statistics', async (c) => {
  const threadId = c.req.query('threadId'); // conversation UUID
  if (!threadId) return c.json({ error: 'Missing threadId' }, 400);

  try {
    const stats = await getStatistics(supa(c.env), threadId);
    if (!stats) return c.json({ error: 'No messages found for this thread' }, 404);
    return c.json(stats);
  } catch (err) {
    console.error('Failed to retrieve statistics:', err?.message);
    return c.json({ error: 'Failed to retrieve statistics' }, 500);
  }
});

// POST /chat/messages — THE streaming handler.
// Runs the Groq Chat Completions tool loop, persists user + assistant rows to Supabase,
// and emits a single final `messages` frame. Keep-alive `:ping` every ~20s; hard ~80s
// wall-clock abort (including the final turn) emitting `{type:'error'}`. Never throws out
// of the stream; the completion tail is guarded so nothing is persisted/emitted after abort.
chat.post('/messages', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { threadId, message } = body; // threadId = conversation UUID

  if (!threadId || !message) {
    return c.json({ error: 'Missing threadId or message' }, 400);
  }

  const client = openai(c.env);
  const model = chatModel(c.env);
  const sb = supa(c.env);

  return streamSSE(c, async (stream) => {
    // raw SSE comment frame so CF doesn't tear down the idle stream
    const ping = setInterval(() => {
      stream.write(': ping\n\n').catch(() => {});
    }, PING_INTERVAL_MS);

    // emit a frame whose JSON payload carries the frontend `type`, mirrored on the SSE
    // `event` field. Frontend reads the JSON payload's `type`.
    const emit = (type, data) => stream.writeSSE({ event: type, data: JSON.stringify({ type, data }) });

    const deadline = Date.now() + WALL_CLOCK_BUDGET_MS;

    try {
      await emit('runStatus', { status: 'in_progress' });

      // history = prior rows (oldest→newest); the engine adds the new user turn in-memory.
      const priorRows = await listMessages(sb, threadId);
      const history = toHistory(priorRows);

      // persist the user message row
      await insertUserMessage(sb, threadId, message);

      // run the Chat Completions tool loop (budget covers the final turn)
      const { finalText, responseId, toolMetadata } = await runChatCompletion(client, {
        model,
        systemPrompt: SYSTEM_PROMPT,
        tools: TOOLS,
        history,
        userMessage: message,
        sb,
        deadline,
      });

      // guarded tail: only persist + emit if we did NOT blow the budget.
      if (Date.now() > deadline) {
        await emit('error', { message: `Processing timed out for thread ${threadId}` });
        return;
      }

      await insertAssistantMessage(sb, threadId, {
        content: finalText,
        metadata: toolMetadata,
        toolCallName: toolMetadata.tool_call_name ?? null,
        responseId,
      });
      await touchThread(sb, threadId);

      const freshRows = await listMessages(sb, threadId);
      await emit('runStatus', { status: 'completed' });
      await emit('messages', buildMessagesFrame(freshRows));
    } catch (err) {
      if (err instanceof BudgetError) {
        await emit('error', { message: `Processing timed out for thread ${threadId}` });
      } else {
        console.error('Failed to process message:', err?.message);
        // never throw out of the stream — emit a terminal error frame instead
        await emit('error', { message: 'Failed to process message' });
      }
    } finally {
      clearInterval(ping);
    }
  });
});
