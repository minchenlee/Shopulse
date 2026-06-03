import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createUser, createThread } from 'shopulse-data/src/users.js';
import { runChatCompletion, BudgetError } from '../src/chat/completions.js';
import {
  insertUserMessage,
  insertAssistantMessage,
  listMessages,
  toHistory,
  getStatistics,
} from '../src/chat/messagesStore.js';

// Local Supabase (same demo service-role key as routes.test.js / data/.env).
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Build an async-iterable of streamed Chat Completions chunks from a compact spec, so the
// loop can be exercised without a live LLM. `toolCalls` chunks split arguments across two
// deltas (mirroring how Groq chunks function.arguments) to exercise accumulateToolCalls.
function makeStream({ content = '', toolCalls = [], finishReason = 'stop', id = 'chatcmpl-test' }) {
  const chunks = [];
  if (content) chunks.push({ id, choices: [{ delta: { content }, finish_reason: null }] });
  toolCalls.forEach((tc, index) => {
    const argStr = JSON.stringify(tc.arguments);
    const half = Math.ceil(argStr.length / 2);
    // first delta: id + name + first half of args
    chunks.push({
      id,
      choices: [{ delta: { tool_calls: [{ index, id: tc.id, type: 'function', function: { name: tc.name, arguments: argStr.slice(0, half) } }] }, finish_reason: null }],
    });
    // second delta: rest of args (no id/name — concatenation must still produce valid JSON)
    chunks.push({
      id,
      choices: [{ delta: { tool_calls: [{ index, function: { arguments: argStr.slice(half) } }] }, finish_reason: null }],
    });
  });
  chunks.push({ id, choices: [{ delta: {}, finish_reason: finishReason }] });
  return {
    async *[Symbol.asyncIterator]() {
      for (const ch of chunks) yield ch;
    },
  };
}

// A mock OpenAI client whose create() returns the next scripted stream per call, and records
// the `messages` array it was handed each turn (so we can assert tool feedback shape).
function mockClient(scripts) {
  let call = 0;
  const seenMessages = [];
  return {
    seenMessages,
    get callCount() { return call; },
    chat: {
      completions: {
        create: async ({ messages }) => {
          seenMessages.push(structuredClone(messages));
          const spec = scripts[call] ?? { finishReason: 'stop' };
          call += 1;
          return makeStream(spec);
        },
      },
    },
  };
}

describe('runChatCompletion — Chat Completions tool loop', () => {
  it('single turn with no tool call returns the final text + response id', async () => {
    const client = mockClient([{ content: 'Hello there.', finishReason: 'stop', id: 'chatcmpl-1' }]);
    const out = await runChatCompletion(client, {
      model: 'm', systemPrompt: 'SYS', tools: [], history: [], userMessage: 'hi',
      sb, deadline: Date.now() + 60000,
    });
    expect(out.finalText).toBe('Hello there.');
    expect(out.responseId).toBe('chatcmpl-1');
    expect(out.toolMetadata).toEqual({});
    // system + user only on the single turn
    expect(client.seenMessages[0]).toEqual([
      { role: 'system', content: 'SYS' },
      { role: 'user', content: 'hi' },
    ]);
  });

  it('runs a filter_products tool call then feeds role:tool results back and finishes', async () => {
    const client = mockClient([
      // turn 1: model asks for filter_products
      { toolCalls: [{ id: 'tc_abc', name: 'filter_products', arguments: { screenType: 'oled', maxPrice: 1000 } }], finishReason: 'tool_calls', id: 'chatcmpl-a' },
      // turn 2: model answers
      { content: 'Here are some OLED TVs under $1000.', finishReason: 'stop', id: 'chatcmpl-b' },
    ]);

    const out = await runChatCompletion(client, {
      model: 'm', systemPrompt: 'SYS', tools: [], history: [], userMessage: 'cheap oled tv',
      sb, deadline: Date.now() + 60000,
    });

    // two create() calls (tool turn + final turn)
    expect(client.callCount).toBe(2);
    expect(out.finalText).toBe('Here are some OLED TVs under $1000.');
    // response id is the FINAL turn's
    expect(out.responseId).toBe('chatcmpl-b');
    // metadata reattached from the live searchProducts call
    expect(out.toolMetadata.tool_call_name).toBe('filter_products');
    expect(JSON.parse(out.toolMetadata.filtering_condition)).toEqual({ screenType: 'oled', maxPrice: 1000 });

    // second turn's messages must contain the assistant-with-tool_calls then a role:'tool'
    // message carrying the SAME tool_call_id the model emitted.
    const turn2 = client.seenMessages[1];
    const assistantTurn = turn2.find((m) => m.role === 'assistant' && m.tool_calls);
    expect(assistantTurn.tool_calls[0].id).toBe('tc_abc');
    expect(assistantTurn.tool_calls[0].function.name).toBe('filter_products');
    // arguments concatenated across the two deltas into valid JSON
    expect(JSON.parse(assistantTurn.tool_calls[0].function.arguments)).toEqual({ screenType: 'oled', maxPrice: 1000 });
    const toolMsg = turn2.find((m) => m.role === 'tool');
    expect(toolMsg.tool_call_id).toBe('tc_abc');
    // the model-facing tool output is a JSON string with NO image URLs leaked
    expect(toolMsg.content).not.toMatch(/productImageList/);
  });

  it('prepends the system prompt and prior history each call', async () => {
    const client = mockClient([{ content: 'ok', finishReason: 'stop' }]);
    const history = [
      { role: 'user', content: 'earlier q' },
      { role: 'assistant', content: 'earlier a' },
    ];
    await runChatCompletion(client, {
      model: 'm', systemPrompt: 'SYS', tools: [], history, userMessage: 'new q',
      sb, deadline: Date.now() + 60000,
    });
    expect(client.seenMessages[0]).toEqual([
      { role: 'system', content: 'SYS' },
      { role: 'user', content: 'earlier q' },
      { role: 'assistant', content: 'earlier a' },
      { role: 'user', content: 'new q' },
    ]);
  });

  it('throws BudgetError before any create() when the deadline is already past', async () => {
    const client = mockClient([{ content: 'should never run', finishReason: 'stop' }]);
    await expect(
      runChatCompletion(client, {
        model: 'm', systemPrompt: 'SYS', tools: [], history: [], userMessage: 'hi',
        sb, deadline: Date.now() - 1,
      })
    ).rejects.toBeInstanceOf(BudgetError);
    expect(client.callCount).toBe(0);
  });
});

describe('messagesStore — Supabase persistence (live local Supabase)', () => {
  // Create a real conversation row so the FK + cascade hold, then clean it up.
  // users.id is a text PK (8-char short uid), so it must be supplied explicitly.
  function shortId() {
    const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
    return [...Array(8)].map(() => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  }
  async function makeConversation() {
    const userId = shortId();
    await createUser(sb, userId);
    const conv = await createThread(sb, userId, {});
    return { userId, convId: conv.id };
  }
  async function cleanup(userId) {
    // messages + conversations cascade from the user / conversation FKs
    await sb.from('users').delete().eq('id', userId);
  }

  it('insertUserMessage / insertAssistantMessage round-trip via listMessages (ascending)', async () => {
    const { userId, convId } = await makeConversation();
    try {
      await insertUserMessage(sb, convId, 'find me an oled tv');
      const meta = {
        tool_call_name: 'filter_products',
        filtering_condition: JSON.stringify({ screenType: 'oled' }),
        img_list_1: JSON.stringify(['https://img/1.jpg']),
      };
      await insertAssistantMessage(sb, convId, {
        content: 'Here are three OLED TVs.',
        metadata: meta,
        toolCallName: 'filter_products',
        responseId: 'chatcmpl-xyz',
      });

      const rows = await listMessages(sb, convId);
      expect(rows).toHaveLength(2);
      // ascending: user first, assistant second
      expect(rows[0].role).toBe('user');
      expect(rows[1].role).toBe('assistant');
      expect(rows[1].metadata.tool_call_name).toBe('filter_products');
      expect(rows[1].tool_call_name).toBe('filter_products');
      expect(rows[1].response_id).toBe('chatcmpl-xyz');
      // image URLs persisted in metadata, not implied to be in content
      expect(rows[1].content).not.toMatch(/img\/1\.jpg/);

      // toHistory drops everything but role + content
      const hist = toHistory(rows);
      expect(hist).toEqual([
        { role: 'user', content: 'find me an oled tv' },
        { role: 'assistant', content: 'Here are three OLED TVs.' },
      ]);
    } finally {
      await cleanup(userId);
    }
  });

  it('getStatistics returns RPC-derived numbers for a populated conversation', async () => {
    const { userId, convId } = await makeConversation();
    try {
      await insertUserMessage(sb, convId, 'one two three');
      await insertAssistantMessage(sb, convId, {
        content: 'four five',
        metadata: { tool_call_name: 'filter_products' },
        toolCallName: 'filter_products',
      });

      const stats = await getStatistics(sb, convId);
      expect(stats).not.toBeNull();
      expect(stats.messageCount).toBe(2);
      expect(stats.userMessageCount).toBe(1);
      expect(stats.assistantMessageCount).toBe(1);
      // word counts use the historical single-space split
      expect(stats.userWordCount).toBe(3);
      expect(stats.assistantWordCount).toBe(2);
      expect(stats.filterProductCount).toBe(1);
    } finally {
      await cleanup(userId);
    }
  });

  it('getStatistics returns null for a conversation with no messages', async () => {
    const { userId, convId } = await makeConversation();
    try {
      const stats = await getStatistics(sb, convId);
      expect(stats).toBeNull();
    } finally {
      await cleanup(userId);
    }
  });
});
