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
// OpenAI-compatible client pointed at Groq (free tier) by default. The OpenAI Node SDK
// works against any OpenAI-compatible base URL. Key: GROQ_API_KEY, falling back to
// OPENAI_API_KEY; base URL overridable via OPENAI_BASE_URL.
export function openai(env) {
  if (!_oa) {
    _oa = new OpenAI({
      apiKey: env.GROQ_API_KEY || env.OPENAI_API_KEY,
      baseURL: env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1',
    });
  }
  return _oa;
}

// Tool-calling chat model. Default is a Groq tool-calling model; overridable via OPENAI_MODEL.
export function chatModel(env) {
  return env.OPENAI_MODEL || 'llama-3.3-70b-versatile';
}
