import { describe, it, expect } from 'vitest';
import 'dotenv/config';
import '../src/nodeShim.js';
import { makeClient } from '../src/supabaseClient.js';
import { createUser, getUser, createThread, getThreadsForUser, deleteThread } from '../src/users.js';

const supabase = makeClient();
// varied per run without Date.now() (unavailable in some sandboxes)
const uid = 'test' + Math.floor(performance.now() % 1e6).toString(36) + process.pid.toString(36);

describe('users + threads', () => {
  it('creates and finds a user', async () => {
    await createUser(supabase, uid);
    expect(await getUser(supabase, uid)).toBeTruthy();
  });
  it('returns null for missing user', async () => {
    expect(await getUser(supabase, 'nope-' + uid)).toBeNull();
  });
  it('creates threads and lists them', async () => {
    const c1 = await createThread(supabase, uid, { uiVariant: 'chat' });
    const c2 = await createThread(supabase, uid, { uiVariant: 'hybrid' });
    const list = await getThreadsForUser(supabase, uid);
    expect(list.length).toBeGreaterThanOrEqual(2);
    await deleteThread(supabase, uid, c1.id);
    await deleteThread(supabase, uid, c2.id);
    expect((await getThreadsForUser(supabase, uid)).length).toBe(0);
  });
});
