// Node-only shim: supabase-js v2 eagerly constructs a Realtime client that needs a global
// WebSocket. Node < 22 lacks one. Import this FIRST in Node entrypoints (scripts/tests).
// NEVER imported by the Cloudflare Worker bundle (Workers provide global WebSocket natively),
// so makeClient() stays runtime-agnostic.
import ws from 'ws';
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = ws;
}
