# Shopulse data layer (Supabase)

Postgres data layer replacing MongoDB. Consumed by the Cloudflare Worker (Track B).

## Setup
1. `cp .env.example .env` and fill `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`.
   - Local stack: `supabase start` (repo root) prints all three (`API URL`, `service_role key`, `DB URL`).
2. `npm install`
3. `npm run db:apply` — creates tables + RPCs.
4. `npm run etl` — loads `../backend/sample.json` (189 TVs). Idempotent (upsert on amazon_url).

## Test
`npm test` — normalizers (unit), products/users (integration, needs seeded DB),
and the cutover gate (needs the old Express backend on :3000 for the diff; auto-skips if down).

## Exports (for Track B)
- `src/supabaseClient.js` → `makeClient(env)` (Workers-safe)
- `src/products.js` → `searchProducts`, `getProductDetails`, `getProductReviews`
- `src/users.js` → `getUser`, `createUser`, `getThreadsForUser`, `createThread`, `deleteThread`, `touchThread`
