import { Hono } from 'hono';
import { getUser, createUser } from 'shopulse-data/src/users.js';
import { supa } from '../env.js';

export const users = new Hono();

users.get('/', async (c) => {
  const u = await getUser(supa(c.env), c.req.query('userId'));
  return u ? c.json({ message: 'User found' }) : c.json({ error: `User not found with ID ${c.req.query('userId')}` }, 404);
});

users.post('/', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const id = body.userId || shortId();
    const u = await createUser(supa(c.env), id);
    return c.json({ userId: u.id, message: 'User created successfully' }, 201);
  } catch (err) {
    console.error('POST /user failed:', err?.message);
    return c.json({ error: 'Failed to create user' }, 500);
  }
});

// 8-char short id (replaces short-unique-id; Workers have global crypto)
function shortId() {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}
