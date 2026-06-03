import { makeClient } from 'shopulse-data/src/supabaseClient.js';
import OpenAI from 'openai';

// Per-isolate memo. c.env carries wrangler vars/secrets.
let _sb, _oa;
export function supa(env) {
  if (!_sb) {
    _sb = makeClient({
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    });
  }
  return _sb;
}
export function openai(env) {
  if (!_oa) _oa = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return _oa;
}
