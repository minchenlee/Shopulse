// lib/api.test.js — pins the D7 error-shape contract.
//
// Callers read `error.response.data.error` (Chat.jsx:138, Hybrid.jsx:147). Native
// fetch has no `.response` and does NOT throw on 4xx/5xx — the wrapper must (a)
// throw on non-2xx and (b) normalize to the axios-shaped { response: { data } }.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchData, postData } from './api.js';

afterEach(() => vi.restoreAllMocks());

describe('api — D7 error shape', () => {
  it('returns parsed JSON on 2xx', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ threads: [] }),
    });
    await expect(fetchData('/chat/threads')).resolves.toEqual({ threads: [] });
  });

  it('throws { response: { data } } on a 4xx with a JSON error body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ error: 'User ID is required' }),
    });
    await expect(postData('/chat/threads', {})).rejects.toMatchObject({
      response: { data: { error: 'User ID is required' } },
    });
  });

  it('still exposes response.data.error when the server body is non-JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => { throw new Error('not json'); },
    });
    let caught;
    try {
      await fetchData('/x');
    } catch (e) {
      caught = e;
    }
    expect(caught.response.data.error).toBe('Internal Server Error');
  });

  it('normalizes a network failure to the same shape', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
    let caught;
    try {
      await fetchData('/x');
    } catch (e) {
      caught = e;
    }
    expect(caught.response.data.error).toBe('network down');
  });
});
