// Test-only shim: under Node < 22, supabase-js's eager Realtime client needs a global
// WebSocket. Cloudflare Workers provide one natively, so this lives only in the test setup,
// never in the Worker bundle.
import ws from 'ws';
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = ws;
}

// Workers provide global `crypto` (Web Crypto); Node 18's vitest env may not expose it as a
// global. Polyfill from node:crypto so route code written for the Workers runtime tests cleanly.
import { webcrypto } from 'node:crypto';
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto;
}
