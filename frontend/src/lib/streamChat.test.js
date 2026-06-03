// lib/streamChat.test.js — pins the R1 transition-order contract.
//
// streamChat must invoke callbacks in the SAME order the old EventSource.onmessage
// did: onEvent (ALWAYS, first) → then onMessages (messages/confirmation) / onRunStatus
// (runStatus). It must ignore `:ping` keep-alive comment frames and split on `\n\n`
// across chunk boundaries. Frames mirror the real Track C worker (chat.js:186-227).

import { describe, it, expect, vi, afterEach } from 'vitest';
import { streamChat } from './streamChat.js';

// Build a ReadableStream that yields the given string chunks as Uint8Array.
function streamFromChunks(chunks) {
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(enc.encode(chunks[i++]));
      } else {
        controller.close();
      }
    },
  });
}

// A Hono streamSSE frame: `event: <type>\ndata: <json>\n\n`.
function sse(type, data) {
  return `event: ${type}\ndata: ${JSON.stringify({ type, data })}\n\n`;
}

afterEach(() => vi.restoreAllMocks());

describe('streamChat — transition order (R1)', () => {
  it('fires onEvent first for every frame, then the typed callback, in stream order', async () => {
    const frames = [
      sse('runStatus', { status: 'in_progress' }),
      ': ping\n\n', // keep-alive — must be ignored
      sse('runStatus', { status: 'completed' }),
      sse('messages', { data: [{ id: '1', role: 'assistant', content: [{ type: 'text', text: { value: 'hi' } }], metadata: {} }] }),
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: streamFromChunks(frames),
    });

    const calls = [];
    await streamChat({
      baseURL: 'http://x',
      threadId: 't1',
      message: 'hello',
      onEvent: (p) => calls.push(['event', p.type]),
      onRunStatus: (s) => calls.push(['runStatus', s]),
      onMessages: (p) => calls.push(['messages', p.type]),
      onError: (e) => calls.push(['error', e]),
    });

    // Order: each frame → onEvent then its typed callback. :ping produced nothing.
    expect(calls).toEqual([
      ['event', 'runStatus'],
      ['runStatus', 'in_progress'],
      ['event', 'runStatus'],
      ['runStatus', 'completed'],
      ['event', 'messages'],
      ['messages', 'messages'],
    ]);
  });

  it('keeps currentMessages.data.data resolvable (R2): the messages payload is passed whole', async () => {
    const messagesData = {
      data: [
        { id: '2', role: 'assistant', content: [{ type: 'text', text: { value: 'newest' } }], metadata: {} },
        { id: '1', role: 'user', content: [{ type: 'text', text: { value: 'oldest' } }], metadata: {} },
      ],
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: streamFromChunks([sse('messages', messagesData)]),
    });

    let received;
    await streamChat({
      baseURL: 'http://x', threadId: 't', message: 'm',
      onMessages: (p) => { received = p; },
    });

    // The full payload is { type:'messages', data:{ data:[…] } } so .data.data is the array.
    expect(received.type).toBe('messages');
    expect(received.data.data).toHaveLength(2);
    expect(received.data.data[0].content[0].text.value).toBe('newest'); // newest-first preserved
  });

  it('reassembles frames split across chunk boundaries', async () => {
    const full = sse('runStatus', { status: 'completed' });
    const mid = Math.floor(full.length / 2);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: streamFromChunks([full.slice(0, mid), full.slice(mid)]),
    });

    const statuses = [];
    await streamChat({
      baseURL: 'http://x', threadId: 't', message: 'm',
      onRunStatus: (s) => statuses.push(s),
    });
    expect(statuses).toEqual(['completed']);
  });

  it('routes a terminal error frame to onError', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: streamFromChunks([sse('error', { message: 'timed out' })]),
    });
    let err;
    await streamChat({
      baseURL: 'http://x', threadId: 't', message: 'm',
      onError: (e) => { err = e; },
    });
    expect(err).toEqual({ message: 'timed out' });
  });

  it('calls onError (not throw) when the request rejects — no reconnect', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
    let err;
    await expect(
      streamChat({ baseURL: 'http://x', threadId: 't', message: 'm', onError: (e) => { err = e; } })
    ).resolves.toBeUndefined();
    expect(err).toBeInstanceOf(Error);
  });
});
