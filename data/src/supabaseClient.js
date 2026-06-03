import { createClient } from '@supabase/supabase-js';

// Workers-safe pattern (Track B reuses this): explicit fetch binding, no session persistence.
// We never use Realtime — but supabase-js v2 constructs a Realtime client eagerly, which needs
// a global WebSocket. Cloudflare Workers and Node 22+ provide one; Node < 22 does not, so we
// inject `ws` only in that case. On Workers this branch is dead (globalThis.WebSocket exists).
export function makeClient(env = process.env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required');
  const options = {
    global: { fetch: fetch.bind(globalThis) },
    auth: { persistSession: false },
  };
  return createClient(url, key, options);
}
