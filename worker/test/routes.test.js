import { describe, it, expect } from 'vitest';
import app from '../src/index.js';

// Local Supabase creds (same demo keys as data/.env). The Worker reads these from c.env;
// app.request(path, init, ENV) injects them.
const ENV = {
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
};

describe('products routes', () => {
  it('GET /products/search?keyword=oled returns an array', async () => {
    const res = await app.request('/products/search?keyword=oled&limit=3', {}, ENV);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].productName).toBeDefined();
  });

  it('GET /products/search without keyword is 400', async () => {
    const res = await app.request('/products/search', {}, ENV);
    expect(res.status).toBe(400);
  });

  it('GET /products/filter?screenType=qled returns qled rows', async () => {
    const res = await app.request('/products/filter?screenType=qled&limit=5', {}, ENV);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe('user routes', () => {
  it('GET /user for missing id is 404', async () => {
    const res = await app.request('/user?userId=definitely-not-a-real-user-xyz', {}, ENV);
    expect(res.status).toBe(404);
  });

  it('POST /user creates and is then findable', async () => {
    const res = await app.request('/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }, ENV);
    expect(res.status).toBe(201);
    const { userId } = await res.json();
    expect(userId).toBeTruthy();
    const found = await app.request(`/user?userId=${userId}`, {}, ENV);
    expect(found.status).toBe(200);
  });
});

describe('chat routes (shape only — no OpenAI)', () => {
  // userId validation happens before any OpenAI call, so these never touch creds.
  it('POST /chat/threads without userId is 400', async () => {
    const res = await app.request('/chat/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }, ENV);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('User ID is required');
  });

  it('GET /chat/threads without userId is 400', async () => {
    const res = await app.request('/chat/threads', {}, ENV);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('User ID is required');
  });

  it('DELETE /chat/threads without userId/threadId is 400', async () => {
    const res = await app.request('/chat/threads', { method: 'DELETE' }, ENV);
    expect(res.status).toBe(400);
  });

  it('POST /chat/messages without threadId/message is 400 (no stream opened)', async () => {
    const res = await app.request('/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }, ENV);
    expect(res.status).toBe(400);
  });

  it('chat module is mounted (unknown /chat path is 404, not a routing crash)', async () => {
    // Module imported cleanly (the import at the top of src/index.js would throw on
    // any bad import); an unknown sub-path returns 404 rather than 500.
    const res = await app.request('/chat/nope', {}, ENV);
    expect(res.status).toBe(404);
  });
});

describe('CORS', () => {
  it('reflects an allowed origin on preflight', async () => {
    const res = await app.request('/products/search?keyword=tv', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'GET' },
    }, ENV);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });

  it('does not reflect a disallowed origin', async () => {
    const res = await app.request('/products/search?keyword=tv', {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example.com', 'Access-Control-Request-Method': 'GET' },
    }, ENV);
    expect(res.headers.get('access-control-allow-origin')).not.toBe('https://evil.example.com');
  });
});
