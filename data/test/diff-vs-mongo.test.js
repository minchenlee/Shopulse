import { describe, it, expect, beforeAll } from 'vitest';
import 'dotenv/config';
import '../src/nodeShim.js';
import { makeClient } from '../src/supabaseClient.js';
import { searchProducts } from '../src/products.js';

const supabase = makeClient();
const OLD = process.env.OLD_BACKEND_URL || 'http://localhost:3000';

// fixed query battery — covers keyword, brand, screenType, resolution, price, size, sort
const QUERIES = [
  { keyword: 'tv', limit: 30 },
  { keyword: 'oled tv', limit: 30 },
  { keyword: 'tv', brand: 'samsung', limit: 30 },
  { keyword: 'tv', screenType: 'oled', limit: 30 },
  { keyword: 'tv', resolution: '4k', limit: 30 },
  { keyword: 'tv', maxPrice: '500', limit: 30 },
  { keyword: 'tv', minScreenSize: '55', limit: 30 },
  { keyword: 'tv', sortBy: 'price', limit: 30 },
];

async function oldSearch(q) {
  const url = new URL(OLD + '/products/search');
  for (const [k, v] of Object.entries(q)) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`old backend ${res.status}`);
  return res.json();
}

const norm = (n) => (n || '').trim().toLowerCase();

// NOTE: the original MongoDB Atlas cluster is decommissioned (DNS no longer resolves), so in
// practice this live gate auto-skips. The cutover gate OF RECORD is `diff-vs-sample.test.js`,
// which diffs the new RPC against sample.json ground truth deterministically. This file remains
// for the case where someone restores a Mongo instance and wants a live cross-check.
//
// The old Express backend must be running on :3000 against Mongo for this gate.
// If it is not reachable, we skip rather than fail — this is an opt-in cutover gate.
let oldReachable = false;
beforeAll(async () => {
  try {
    const res = await fetch(OLD + '/products/search?keyword=tv&limit=1');
    oldReachable = res.ok;
  } catch { oldReachable = false; }
  if (!oldReachable) console.warn(`\n[diff-vs-mongo] old backend not reachable at ${OLD} — SKIPPING cutover gate. Start \`cd backend && npm start\` to run it.`);
});

describe('new RPC vs old Atlas search (cutover gate)', () => {
  for (const q of QUERIES) {
    it(`set overlap for ${JSON.stringify(q)}`, async () => {
      if (!oldReachable) return; // skip silently when old backend is down
      const [oldRows, newRows] = await Promise.all([oldSearch(q), searchProducts(supabase, q)]);
      const oldSet = new Set(oldRows.map((r) => norm(r.productName)));
      const newSet = new Set(newRows.map((r) => norm(r.productName)));
      const inter = [...oldSet].filter((n) => newSet.has(n));
      const union = new Set([...oldSet, ...newSet]).size;
      const jaccard = union ? inter.length / union : 0;
      console.log(JSON.stringify(q), 'jaccard', jaccard.toFixed(2), 'old', oldSet.size, 'new', newSet.size);
      expect(jaccard).toBeGreaterThan(0.6);
    });
  }
});
