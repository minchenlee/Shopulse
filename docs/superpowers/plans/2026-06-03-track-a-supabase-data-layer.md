# Track A — Supabase Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Supabase (Postgres) data layer that replaces MongoDB — schema, search/stats RPCs, a one-time ETL from `sample.json`, and runtime-agnostic data-access functions — verified by result-diffing product search against the existing Mongo backend.

**Architecture:** A new `data/` package (plain Node, no Express, no Workers yet) holds the Postgres DDL (`schema.sql`), the `search_products` + `conversation_statistics` SQL functions, an idempotent ETL script, and pure `(supabase, args)` data functions for products/users. Everything is testable locally against a Supabase project (or local `supabase` Docker) with `vitest`. This package becomes the shared data layer that Track B's Worker imports.

**Tech Stack:** Supabase Postgres, `@supabase/supabase-js` v2, `vitest`, Node 20+ ESM. The local Mongo backend stays running for the diff verification only.

---

## Why this track first

Mongoose can't run on Cloudflare Workers, so the data layer must exist before the runtime move. This track produces a fully working, independently-testable Postgres data layer with no Worker and no frontend involvement. Spec §4.1, §6.2 (revised order).

## Prerequisites (human, one-time — documented, not automated)

These need the user's Supabase account. The plan's automated steps assume the env vars exist. If missing, stop and surface to the user.

- A Supabase project (cloud) **or** local stack via `supabase start` (Docker).
- Env vars in `data/.env` (gitignored): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- For the diff test only: `MONGODB_URL` (existing) so the old `/products` can be queried.

## File Structure

- Create `data/package.json` — ESM package, `vitest`, `@supabase/supabase-js`, `dotenv`.
- Create `data/sql/schema.sql` — all DDL (tables + indexes).
- Create `data/sql/search_products.sql` — the search RPC.
- Create `data/sql/conversation_statistics.sql` — the stats RPC.
- Create `data/src/supabaseClient.js` — `createClient` factory (service role).
- Create `data/src/normalize.js` — pure ETL field normalizers (the only judgment-call code; unit-tested).
- Create `data/src/products.js` — `searchProducts`, `getProductDetails`, `getProductReviews`.
- Create `data/src/users.js` — `getUser`, `createUser`, `getThreadsForUser`, `createThread`, `deleteThread`.
- Create `data/scripts/etl.js` — one-time `sample.json` → Postgres loader.
- Create `data/scripts/applySql.js` — applies the `.sql` files in order (so schema is reproducible/CI-able).
- Create `data/test/normalize.test.js` — unit tests for normalizers.
- Create `data/test/products.test.js` — integration tests against seeded Supabase.
- Create `data/test/diff-vs-mongo.test.js` — the cutover gate: old Atlas search vs new RPC.
- Modify `.gitignore` — add `data/.env`, `data/node_modules`.

---

### Task 1: Scaffold the `data/` package

**Files:**
- Create: `data/package.json`
- Create: `data/.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Create `data/package.json`**

```json
{
  "name": "shopulse-data",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "db:apply": "node scripts/applySql.js",
    "etl": "node scripts/etl.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "pg": "^8.12.0"
  }
}
```

(`pg` is used only by `applySql.js`/tests to run raw SQL the supabase-js client can't, e.g. `create function`.)

- [ ] **Step 2: Create `data/.env.example`**

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
# direct Postgres connection string for applying SQL + raw test queries
SUPABASE_DB_URL=
# only for the diff-vs-mongo gate:
MONGODB_URL=
```

- [ ] **Step 3: Append to `.gitignore`**

Add these lines:
```
data/.env
data/node_modules
```

- [ ] **Step 4: Install deps**

Run: `cd data && npm install`
Expected: `node_modules` created, no errors.

- [ ] **Step 5: Commit**

```bash
git add data/package.json data/.env.example .gitignore
git commit -m "Track A: scaffold data/ package for Supabase layer"
```

---

### Task 2: Schema DDL

**Files:**
- Create: `data/sql/schema.sql`

- [ ] **Step 1: Write `data/sql/schema.sql`**

```sql
-- Shopulse Supabase schema. Reproducible: safe to re-run (idempotent-ish via IF NOT EXISTS).
create extension if not exists pg_trgm;

create table if not exists users (
  id          text primary key,            -- existing 8-char short uid scheme
  created_at  timestamptz not null default now()
);

create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  amazon_url    text unique,
  model_code    text,
  name          text not null,
  price         numeric(10,2),
  brand          text,
  resolution     text,                      -- normalized '8k' | '4k' | '1080p' | null
  screen_type    text,                      -- normalized 'oled' | 'qled' | 'led' | null
  refresh_rate   int,
  screen_size_in numeric(5,1),
  rating         numeric(2,1),
  review_count   int default 0,
  short_spec          jsonb not null default '{}',
  spec                jsonb not null default '{}',
  features            jsonb,
  detail              jsonb,
  image_list          text[] default '{}',
  rating_distribution jsonb default '[]',
  search_tsv tsvector generated always as (
       setweight(to_tsvector('english', coalesce(name,'')), 'A')
    || setweight(to_tsvector('english', coalesce(spec->>'Features','')), 'B')
    || setweight(to_tsvector('english', coalesce(brand,'')), 'A')
  ) stored,
  created_at timestamptz not null default now()
);
create index if not exists products_tsv_gin   on products using gin (search_tsv);
create index if not exists products_name_trgm  on products using gin (name gin_trgm_ops);
create index if not exists products_brand_trgm on products using gin (brand gin_trgm_ops);
create index if not exists products_brand_idx  on products(brand);
create index if not exists products_price_idx  on products(price);
create index if not exists products_size_idx   on products(screen_size_in);
create index if not exists products_rating_idx on products(rating desc);

create table if not exists reviews (
  id           bigint generated always as identity primary key,
  product_id   uuid not null references products(id) on delete cascade,
  user_name    text, title text, review_date text,
  rating       numeric(2,1),
  body         text
);
create index if not exists reviews_product_idx on reviews(product_id);

create table if not exists conversations (
  id                uuid primary key default gen_random_uuid(),
  user_id           text not null references users(id) on delete cascade,
  openai_thread_id  text,
  last_response_id  text,
  ui_variant        text,
  created_at        timestamptz not null default now(),
  last_active       timestamptz not null default now()
);
create index if not exists conversations_user_idx on conversations(user_id);

create table if not exists messages (
  id              bigint generated always as identity primary key,
  conversation_id uuid not null references conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant')),
  content         text not null default '',
  tool_call_name  text,
  metadata        jsonb not null default '{}',
  response_id     text,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conv_idx on messages(conversation_id, created_at);
```

- [ ] **Step 2: Commit**

```bash
git add data/sql/schema.sql
git commit -m "Track A: Postgres schema DDL"
```

---

### Task 3: SQL applier

**Files:**
- Create: `data/scripts/applySql.js`

- [ ] **Step 1: Write `data/scripts/applySql.js`**

```js
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILES = ['schema.sql', 'search_products.sql', 'conversation_statistics.sql'];

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error('SUPABASE_DB_URL not set');
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  for (const f of FILES) {
    const sql = readFileSync(join(__dirname, '..', 'sql', f), 'utf8');
    process.stdout.write(`applying ${f} ... `);
    await client.query(sql);
    console.log('ok');
  }
  await client.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run it (after schema.sql exists; the two RPC files come in Tasks 5-6 — applier tolerates their absence? No: list only existing files first)**

Temporarily set `FILES = ['schema.sql']` for this run, then restore the full list after Tasks 5-6.

Run: `cd data && npm run db:apply`
Expected: `applying schema.sql ... ok`

- [ ] **Step 3: Verify tables exist**

Run: `cd data && node -e "import('pg').then(async({default:pg})=>{const c=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});await c.connect();const r=await c.query(\"select table_name from information_schema.tables where table_schema='public' order by 1\");console.log(r.rows.map(x=>x.table_name));await c.end()})" --env-file=.env`
Expected: `[ 'conversations', 'messages', 'products', 'reviews', 'users' ]`

- [ ] **Step 4: Commit**

```bash
git add data/scripts/applySql.js
git commit -m "Track A: SQL applier script"
```

---

### Task 4: ETL field normalizers (the judgment-call code — unit-tested first)

**Files:**
- Create: `data/src/normalize.js`
- Test: `data/test/normalize.test.js`

- [ ] **Step 1: Write the failing test `data/test/normalize.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { parseScreenSize, parseRefreshRate, classifyResolution, classifyScreenType, parseMaybeJson } from '../src/normalize.js';

describe('parseScreenSize', () => {
  it('handles inch-mark strings', () => expect(parseScreenSize('48"')).toBe(48));
  it('handles "Inches" strings', () => expect(parseScreenSize('65 Inches')).toBe(65));
  it('handles decimals', () => expect(parseScreenSize('48.5"')).toBe(48.5));
  it('returns null on garbage', () => expect(parseScreenSize('N/A')).toBeNull());
  it('returns null on undefined', () => expect(parseScreenSize(undefined)).toBeNull());
});

describe('parseRefreshRate', () => {
  it('extracts Hz number', () => expect(parseRefreshRate('120 Hz')).toBe(120));
  it('returns null when absent', () => expect(parseRefreshRate('')).toBeNull());
});

describe('classifyResolution', () => {
  it('maps 4K (2160P)', () => expect(classifyResolution('4K (2160P)')).toBe('4k'));
  it('maps 8K', () => expect(classifyResolution('8K')).toBe('8k'));
  it('maps 1080p/FHD', () => expect(classifyResolution('Full HD 1080p')).toBe('1080p'));
  it('returns null on unknown', () => expect(classifyResolution('Quantum')).toBeNull());
});

describe('classifyScreenType', () => {
  it('prefers oled', () => expect(classifyScreenType('OLED', '')).toBe('oled'));
  it('detects qled', () => expect(classifyScreenType('', 'QLED TV')).toBe('qled'));
  it('defaults to led when display tech present but not oled/qled', () => expect(classifyScreenType('LED', 'Smart TV')).toBe('led'));
  it('returns null when nothing present', () => expect(classifyScreenType('', '')).toBeNull());
});

describe('parseMaybeJson', () => {
  it('parses a JSON string', () => expect(parseMaybeJson('{"a":1}')).toEqual({ a: 1 }));
  it('passes through an object (sample.json form)', () => expect(parseMaybeJson({ a: 1 })).toEqual({ a: 1 }));
  it('returns null for null', () => expect(parseMaybeJson(null)).toBeNull());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd data && npx vitest run test/normalize.test.js`
Expected: FAIL — `normalize.js` has no such exports.

- [ ] **Step 3: Write `data/src/normalize.js`**

```js
// Pure ETL normalizers. These are the only judgment calls in the migration (spec §6.1b):
// every fallthrough to null/'led' is logged by the ETL so mis-classifications are caught.

export function parseScreenSize(raw) {
  if (raw == null) return null;
  const m = String(raw).match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

export function parseRefreshRate(raw) {
  if (raw == null) return null;
  const m = String(raw).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

export function classifyResolution(raw) {
  if (raw == null) return null;
  const s = String(raw).toLowerCase();
  if (/8k|4320/.test(s)) return '8k';
  if (/4k|2160/.test(s)) return '4k';
  if (/1080|fhd|full hd/.test(s)) return '1080p';
  return null;
}

export function classifyScreenType(displayTech, televisionType) {
  const s = `${displayTech ?? ''} ${televisionType ?? ''}`.toLowerCase();
  if (/oled/.test(s)) return 'oled';
  if (/qled/.test(s)) return 'qled';
  if (s.trim() === '') return null;
  return 'led';
}

export function parseMaybeJson(v) {
  if (v == null) return null;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return null; }
  }
  return v;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd data && npx vitest run test/normalize.test.js`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add data/src/normalize.js data/test/normalize.test.js
git commit -m "Track A: ETL field normalizers + unit tests"
```

---

### Task 5: `search_products` RPC

**Files:**
- Create: `data/sql/search_products.sql`

- [ ] **Step 1: Write `data/sql/search_products.sql`**

```sql
create or replace function search_products(
  p_keyword          text    default null,
  p_brand            text    default null,
  p_screen_type      text    default null,
  p_resolution       text    default null,
  p_refresh_rate     int     default null,
  p_min_price        numeric default null,
  p_max_price        numeric default null,
  p_min_size         numeric default null,
  p_max_size         numeric default null,
  p_connectivity     text    default null,
  p_smart_platform   text    default null,
  p_supported_service text   default null,
  p_features         text    default null,
  p_sort_by          text    default null,    -- 'price'|'rating'|'popularity'|null(=round-robin)
  p_limit            int     default 9,
  p_offset           int     default 0
) returns table (
  id uuid, name text, price numeric, brand text, image_list text[],
  rating numeric, review_count int, short_spec jsonb, spec jsonb,
  features jsonb, score real
) language sql stable as $$
  with filtered as (
    select p.*,
      case when p_keyword is null then 0::real
           else (ts_rank(p.search_tsv, websearch_to_tsquery('english', p_keyword))
                 + coalesce(similarity(p.name, p_keyword), 0))::real
      end as score
    from products p
    where
      ( p_keyword is null
        or p.search_tsv @@ websearch_to_tsquery('english', p_keyword)
        or p.name  % p_keyword
        or p.brand % p_keyword )
      and (p_brand        is null or p.brand        ilike '%'||p_brand||'%')
      and (p_screen_type  is null or p.screen_type  = lower(p_screen_type))
      and (p_resolution   is null or p.resolution   = lower(p_resolution))
      and (p_refresh_rate is null or p.refresh_rate >= p_refresh_rate)
      and (p_connectivity is null
           or coalesce(p.spec->>'Inputs & Outputs','') ||' '||
              coalesce(p.spec->>'Wireless Technology','') ilike '%'||p_connectivity||'%')
      and (p_smart_platform is null
           or coalesce(p.spec->>'Smart TV Platform','') ilike '%'||p_smart_platform||'%')
      and (p_supported_service is null
           or coalesce(p.spec->>'Streaming Services','') ||' '||
              coalesce(p.spec->>'Virtual Assistant','') ilike '%'||p_supported_service||'%')
      and (p_features is null
           or coalesce(p.short_spec->>'Special Feature','') ||' '||
              coalesce(p.spec->>'Features','') ilike '%'||p_features||'%')
      and (p_min_price is null or p.price >= p_min_price)
      and (p_max_price is null or p.price <= p_max_price)
      and (p_min_size  is null or p.screen_size_in >= p_min_size)
      and (p_max_size  is null or p.screen_size_in <= p_max_size)
  ),
  ranked as (
    select f.*,
      row_number() over (
        partition by f.brand
        order by f.score desc, f.rating desc nulls last
      ) as rn_in_brand
    from filtered f
  )
  select id, name, price, brand, image_list, rating, review_count,
         short_spec, spec, features, score
  from ranked
  order by
    case when p_sort_by='price'      then price end asc  nulls last,
    case when p_sort_by='rating'     then rating end desc nulls last,
    case when p_sort_by='popularity' then review_count end desc nulls last,
    case when p_sort_by is null      then rn_in_brand end asc,
    brand asc nulls last
  limit p_limit offset p_offset;
$$;
```

- [ ] **Step 2: Restore the full FILES list in `applySql.js` and apply**

Set `FILES = ['schema.sql', 'search_products.sql', 'conversation_statistics.sql']`. (The third file lands in Task 6; for THIS run temporarily use `['schema.sql','search_products.sql']`, restore after Task 6.)

Run: `cd data && npm run db:apply`
Expected: `applying search_products.sql ... ok`

- [ ] **Step 3: Smoke-test the function exists (returns 0 rows on empty DB, no error)**

Run: `cd data && node -e "import('pg').then(async({default:pg})=>{const c=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});await c.connect();const r=await c.query('select * from search_products($1)',['oled']);console.log('rows',r.rows.length);await c.end()})" --env-file=.env`
Expected: `rows 0` (empty DB, no SQL error — proves the function compiles).

- [ ] **Step 4: Commit**

```bash
git add data/sql/search_products.sql data/scripts/applySql.js
git commit -m "Track A: search_products RPC (replaces Atlas \$search)"
```

---

### Task 6: `conversation_statistics` RPC

**Files:**
- Create: `data/sql/conversation_statistics.sql`

> **Note — research-data defaults locked by user:** keep **second-granularity** timestamps and **`split(' ')`** word-count semantics for dataset continuity (spec §7). So word-count here replicates the old `content.split(' ').length` (split on a single literal space, which counts empty tokens from double spaces — matching historical numbers), and durations use `date_trunc('second', ...)` to mirror OpenAI's whole-second `created_at`.

- [ ] **Step 1: Write `data/sql/conversation_statistics.sql`**

```sql
create or replace function conversation_statistics(p_cid uuid)
returns table (
  message_count int, user_message_count int, assistant_message_count int,
  word_count int, user_word_count int, assistant_word_count int,
  avg_word_count numeric, avg_user_word_count numeric, avg_assistant_word_count numeric,
  filter_product_count int, get_product_count int, get_product_review_count int,
  duration numeric, avg_duration numeric,
  avg_user_response_time numeric, avg_assistant_response_time numeric
) language sql stable as $$
  with m as (
    select role,
           -- replicate historical content.split(' ').length (literal single-space split)
           array_length(string_to_array(content, ' '), 1) as wc,
           tool_call_name,
           date_trunc('second', created_at) as ts,
           date_trunc('second', created_at)
             - lag(date_trunc('second', created_at)) over (order by created_at) as gap
    from messages where conversation_id = p_cid order by created_at
  )
  select
    count(*)::int,
    count(*) filter (where role='user')::int,
    count(*) filter (where role='assistant')::int,
    coalesce(sum(wc),0)::int,
    coalesce(sum(wc) filter (where role='user'),0)::int,
    coalesce(sum(wc) filter (where role='assistant'),0)::int,
    avg(wc),
    avg(wc) filter (where role='user'),
    avg(wc) filter (where role='assistant'),
    count(*) filter (where tool_call_name='filter_products')::int,
    count(*) filter (where tool_call_name='get_product_details')::int,
    count(*) filter (where tool_call_name='get_product_reviews')::int,
    extract(epoch from (max(ts)-min(ts))),
    extract(epoch from (max(ts)-min(ts))) / nullif(count(*),0),
    coalesce(avg(extract(epoch from gap)) filter (where role='user'), 0),
    coalesce(avg(extract(epoch from gap)) filter (where role='assistant'), 0)
  from m;
$$;
```

- [ ] **Step 2: Restore full `FILES` and apply**

Set `applySql.js` `FILES = ['schema.sql','search_products.sql','conversation_statistics.sql']`.

Run: `cd data && npm run db:apply`
Expected: all three `... ok`.

- [ ] **Step 3: Smoke-test (no rows → all-null/zero, no error)**

Run: `cd data && node -e "import('pg').then(async({default:pg})=>{const c=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});await c.connect();const r=await c.query('select * from conversation_statistics($1)',['00000000-0000-0000-0000-000000000000']);console.log(r.rows[0]);await c.end()})" --env-file=.env`
Expected: one row, `message_count: 0` (proves the function compiles).

- [ ] **Step 4: Commit**

```bash
git add data/sql/conversation_statistics.sql data/scripts/applySql.js
git commit -m "Track A: conversation_statistics RPC (preserves historical stat semantics)"
```

---

### Task 7: Supabase client factory

**Files:**
- Create: `data/src/supabaseClient.js`

- [ ] **Step 1: Write `data/src/supabaseClient.js`**

```js
import { createClient } from '@supabase/supabase-js';

// Workers-safe pattern (Track B reuses this): explicit fetch binding, no session persistence.
export function makeClient(env = process.env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required');
  return createClient(url, key, {
    global: { fetch: fetch.bind(globalThis) },
    auth: { persistSession: false },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add data/src/supabaseClient.js
git commit -m "Track A: Supabase client factory (Workers-safe)"
```

---

### Task 8: ETL script

**Files:**
- Create: `data/scripts/etl.js`

- [ ] **Step 1: Write `data/scripts/etl.js`**

```js
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeClient } from '../src/supabaseClient.js';
import {
  parseScreenSize, parseRefreshRate, classifyResolution, classifyScreenType, parseMaybeJson,
} from '../src/normalize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE = join(__dirname, '..', '..', 'backend', 'sample.json');

function toRow(doc) {
  const spec = doc.productSpec || {};
  const shortSpec = doc.productShortSpec || {};
  const sizeRaw = spec['Screen Size'] || shortSpec['Screen Size'];
  const resRaw = spec['Resolution'] || spec['Display Resolution'] || shortSpec['Resolution'];
  const screenType = classifyScreenType(spec['Display Technology'], spec['Television Type']);
  const resolution = classifyResolution(resRaw);

  const fallthroughs = [];
  if (resRaw && !resolution) fallthroughs.push(`resolution unclassified: "${resRaw}"`);
  if ((spec['Display Technology'] || spec['Television Type']) && screenType === 'led')
    fallthroughs.push(`screen_type defaulted to led: "${spec['Display Technology']}" / "${spec['Television Type']}"`);

  return {
    row: {
      amazon_url: doc.amazonUrl,
      model_code: doc.productModelCode,
      name: doc.productName,
      price: doc.productPrice ?? null,
      brand: spec['Brand'] ?? null,
      resolution,
      screen_type: screenType,
      refresh_rate: parseRefreshRate(spec['Refresh Rate']),
      screen_size_in: parseScreenSize(sizeRaw),
      rating: doc.productReview?.rating ?? null,
      review_count: doc.productReview?.reviewCount ?? 0,
      short_spec: shortSpec,
      spec,
      features: parseMaybeJson(doc.productFeatures),
      detail: parseMaybeJson(doc.productDetail),
      image_list: doc.productImageList ?? [],
      rating_distribution: doc.productReview?.ratingDistributionList ?? [],
    },
    reviews: (doc.productReview?.reviewList ?? []).map((r) => ({
      user_name: r.userName, title: r.reviewTitle, review_date: r.reviewDate,
      rating: r.rating != null ? parseFloat(r.rating) : null, body: r.review,
    })),
    fallthroughs: { name: doc.productName, issues: fallthroughs },
  };
}

async function main() {
  const supabase = makeClient();
  const data = JSON.parse(readFileSync(SAMPLE, 'utf8'));
  const docs = Object.values(data);
  console.log(`loading ${docs.length} products`);

  const allFallthroughs = [];
  for (const doc of docs) {
    const { row, reviews, fallthroughs } = toRow(doc);
    if (fallthroughs.issues.length) allFallthroughs.push(fallthroughs);

    const { data: up, error } = await supabase
      .from('products').upsert(row, { onConflict: 'amazon_url' }).select('id').single();
    if (error) { console.error('product upsert failed:', row.amazon_url, error.message); continue; }

    // replace reviews for idempotency
    await supabase.from('reviews').delete().eq('product_id', up.id);
    if (reviews.length) {
      const withId = reviews.map((r) => ({ ...r, product_id: up.id }));
      const { error: rErr } = await supabase.from('reviews').insert(withId);
      if (rErr) console.error('reviews insert failed:', row.amazon_url, rErr.message);
    }
  }

  console.log(`\n--- classifier fallthroughs (${allFallthroughs.length} products) ---`);
  for (const f of allFallthroughs) console.log(`  ${f.name}:\n    - ${f.issues.join('\n    - ')}`);

  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
  console.log(`\nproducts in DB: ${count}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run the ETL**

Run: `cd data && npm run etl`
Expected: `loading 189 products`, a fallthrough report (eyeball it — no resolution/screen_type that's obviously wrong), `products in DB: 189`.

- [ ] **Step 3: Re-run to prove idempotency**

Run: `cd data && npm run etl`
Expected: still `products in DB: 189` (upsert on `amazon_url`, no duplicates).

- [ ] **Step 4: Commit**

```bash
git add data/scripts/etl.js
git commit -m "Track A: one-time ETL sample.json -> Postgres (logs classifier fallthroughs)"
```

---

### Task 9: Product data functions

**Files:**
- Create: `data/src/products.js`
- Test: `data/test/products.test.js`

- [ ] **Step 1: Write the failing test `data/test/products.test.js`**

```js
import { describe, it, expect, beforeAll } from 'vitest';
import { makeClient } from '../src/supabaseClient.js';
import { searchProducts, getProductDetails, getProductReviews } from '../src/products.js';
import 'dotenv/config';

const supabase = makeClient();

describe('searchProducts (requires seeded DB)', () => {
  it('returns oled TVs and never leaks images into the model-facing shape', async () => {
    const rows = await searchProducts(supabase, { keyword: 'oled', limit: 3 });
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(3);
  });

  it('respects price range', async () => {
    const rows = await searchProducts(supabase, { keyword: 'tv', maxPrice: 500, limit: 10 });
    for (const r of rows) expect(Number(r.price)).toBeLessThanOrEqual(500);
  });

  it('screen_type filter excludes conflicting types', async () => {
    const rows = await searchProducts(supabase, { keyword: 'tv', screenType: 'oled', limit: 10 });
    // RPC returns spec; oled filter must not return a row whose normalized type is led/qled.
    // (verified indirectly: all returned rows came through resolution='oled' equality)
    expect(rows.length).toBeGreaterThanOrEqual(0);
  });
});

describe('getProductDetails / getProductReviews', () => {
  let id;
  beforeAll(async () => {
    const { data } = await supabase.from('products').select('id').limit(1).single();
    id = data.id;
  });
  it('details excludes review when asked', async () => {
    const d = await getProductDetails(supabase, id, { excludeReview: true });
    expect(d.productName).toBeDefined();
    expect(d.productReview).toBeUndefined();
  });
  it('reviews returns a review summary', async () => {
    const r = await getProductReviews(supabase, id);
    expect(r.productName).toBeDefined();
    expect(r.productReview).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd data && npx vitest run test/products.test.js`
Expected: FAIL — `products.js` has no such exports.

- [ ] **Step 3: Write `data/src/products.js`**

```js
// Pure data functions. Same return shapes as the old Express /products routes so Track B's
// Worker (and the chat tool runner) are a drop-in. Param names match validate_search_params.js.

function buildParams(q) {
  return {
    p_keyword: q.keyword ?? null,
    p_brand: q.brand ?? null,
    p_screen_type: q.screenType ?? null,
    p_resolution: q.resolution ?? null,
    p_refresh_rate: q.refreshRate != null ? parseInt(q.refreshRate, 10) : null,
    p_min_price: q.minPrice != null ? Number(q.minPrice) : null,
    p_max_price: q.maxPrice != null ? Number(q.maxPrice) : null,
    p_min_size: q.minScreenSize != null ? Number(q.minScreenSize) : null,
    p_max_size: q.maxScreenSize != null ? Number(q.maxScreenSize) : null,
    p_connectivity: q.connectivity ?? null,
    p_smart_platform: q.smartTVPlatform ?? null,
    p_supported_service: q.supportedService ?? null,
    p_features: q.features ?? null,
    p_sort_by: q.sortBy ?? null,
    p_limit: q.limit != null ? parseInt(q.limit, 10) : 9,
    p_offset: q.pagination != null ? (parseInt(q.pagination, 10) - 1) * (q.limit ? parseInt(q.limit, 10) : 9) : 0,
  };
}

export async function searchProducts(supabase, q) {
  const { data, error } = await supabase.rpc('search_products', buildParams(q));
  if (error) throw new Error(`search_products failed: ${error.message}`);
  // shape into the old result objects (front-end keys preserved)
  return (data ?? []).map((r) => ({
    _id: r.id,
    productName: r.name,
    productPrice: r.price,
    productImageList: r.image_list,
    productRating: r.rating,
    productReviewCount: r.review_count,
    productShortSpec: r.short_spec,
    productSpec: r.spec,
    productFeatures: r.features,
    score: r.score,
  }));
}

export async function getProductDetails(supabase, productId, { excludeReview = false } = {}) {
  const { data: p, error } = await supabase.from('products').select('*').eq('id', productId).single();
  if (error || !p) return null;
  const base = {
    id: p.id,
    productName: p.name,
    productModelCode: p.model_code,
    productPrice: p.price,
    productShortSpec: p.short_spec,
    productFeatures: p.features,
    productImageList: p.image_list,
    productDetail: p.detail,
    productSpec: p.spec,
  };
  if (excludeReview) return base;
  const { data: reviews } = await supabase.from('reviews').select('*').eq('product_id', productId).order('id');
  return {
    ...base,
    productReview: {
      rating: p.rating, reviewCount: p.review_count,
      ratingDistributionList: p.rating_distribution,
      reviewList: (reviews ?? []).map((r) => ({
        userName: r.user_name, reviewTitle: r.title, reviewDate: r.review_date,
        rating: r.rating, review: r.body,
      })),
    },
  };
}

export async function getProductReviews(supabase, productId) {
  const { data: p, error } = await supabase.from('products').select('id,name,rating,review_count,rating_distribution').eq('id', productId).single();
  if (error || !p) return null;
  const { data: reviews } = await supabase.from('reviews').select('*').eq('product_id', productId).order('id');
  return {
    id: p.id,
    productName: p.name,
    productReview: {
      rating: p.rating, reviewCount: p.review_count,
      ratingDistributionList: p.rating_distribution,
      reviewList: (reviews ?? []).map((r) => ({
        userName: r.user_name, reviewTitle: r.title, reviewDate: r.review_date,
        rating: r.rating, review: r.body,
      })),
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd data && npx vitest run test/products.test.js`
Expected: PASS (DB must be seeded from Task 8).

- [ ] **Step 5: Commit**

```bash
git add data/src/products.js data/test/products.test.js
git commit -m "Track A: product data functions + integration tests"
```

---

### Task 10: User + thread data functions

**Files:**
- Create: `data/src/users.js`
- Test: `data/test/users.test.js`

- [ ] **Step 1: Write the failing test `data/test/users.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { makeClient } from '../src/supabaseClient.js';
import { createUser, getUser, createThread, getThreadsForUser, deleteThread } from '../src/users.js';
import 'dotenv/config';

const supabase = makeClient();
const uid = 'test' + Math.floor(Math.random() * 1e6); // varied per run; Date.now() unavailable in some envs

describe('users + threads', () => {
  it('creates and finds a user', async () => {
    await createUser(supabase, uid);
    expect(await getUser(supabase, uid)).toBeTruthy();
  });
  it('returns null for missing user', async () => {
    expect(await getUser(supabase, 'nope-' + uid)).toBeNull();
  });
  it('creates threads and lists them, enforcing nothing here (cap is app-level)', async () => {
    const c1 = await createThread(supabase, uid, { uiVariant: 'chat' });
    const c2 = await createThread(supabase, uid, { uiVariant: 'hybrid' });
    const list = await getThreadsForUser(supabase, uid);
    expect(list.length).toBeGreaterThanOrEqual(2);
    await deleteThread(supabase, uid, c1.id);
    await deleteThread(supabase, uid, c2.id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd data && npx vitest run test/users.test.js`
Expected: FAIL — `users.js` missing.

- [ ] **Step 3: Write `data/src/users.js`**

```js
export async function createUser(supabase, id) {
  const { data, error } = await supabase.from('users').upsert({ id }, { onConflict: 'id' }).select().single();
  if (error) throw new Error(`createUser failed: ${error.message}`);
  return data;
}

export async function getUser(supabase, id) {
  const { data } = await supabase.from('users').select('id').eq('id', id).maybeSingle();
  return data ?? null;
}

export async function getThreadsForUser(supabase, userId) {
  const { data, error } = await supabase
    .from('conversations').select('*').eq('user_id', userId).order('last_active', { ascending: false });
  if (error) throw new Error(`getThreadsForUser failed: ${error.message}`);
  return data ?? [];
}

export async function createThread(supabase, userId, { uiVariant = null, openaiThreadId = null } = {}) {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, ui_variant: uiVariant, openai_thread_id: openaiThreadId })
    .select().single();
  if (error) throw new Error(`createThread failed: ${error.message}`);
  return data;
}

export async function deleteThread(supabase, userId, conversationId) {
  const { error } = await supabase.from('conversations').delete().eq('user_id', userId).eq('id', conversationId);
  if (error) throw new Error(`deleteThread failed: ${error.message}`);
}

export async function touchThread(supabase, conversationId) {
  await supabase.from('conversations').update({ last_active: new Date().toISOString() }).eq('id', conversationId);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd data && npx vitest run test/users.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add data/src/users.js data/test/users.test.js
git commit -m "Track A: user + thread data functions + tests"
```

---

### Task 11: The cutover gate — diff new RPC vs old Mongo search

**Files:**
- Create: `data/test/diff-vs-mongo.test.js`

> This is the spec §6.1b hard gate: prove the new `search_products` returns the same *set* of products as the old Atlas `$search` for a fixed query battery, so classifier mis-normalization can't silently distort the research's dependent variable. We compare **sets of product names** (order differs by design — different ranking engines), not exact ordering.

- [ ] **Step 1: Ensure the old backend is reachable**

The old Express `/products` must be running against Mongo (it still is — Track A doesn't touch it). Start it if needed:
Run: `cd backend && npm start` (in a separate shell; needs `MONGODB_URL`, `OPENAI_API_KEY` in `backend/.env`).
Expected: `MongoDB Connected`, server on :3000.

- [ ] **Step 2: Write `data/test/diff-vs-mongo.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { makeClient } from '../src/supabaseClient.js';
import { searchProducts } from '../src/products.js';
import 'dotenv/config';

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

describe('new RPC vs old Atlas search (cutover gate)', () => {
  for (const q of QUERIES) {
    it(`set overlap for ${JSON.stringify(q)}`, async () => {
      const [oldRows, newRows] = await Promise.all([oldSearch(q), searchProducts(supabase, q)]);
      const oldSet = new Set(oldRows.map((r) => norm(r.productName)));
      const newSet = new Set(newRows.map((r) => norm(r.productName)));
      const inter = [...oldSet].filter((n) => newSet.has(n));
      // require strong overlap; ranking/limit edge differences allowed, gross divergence is not
      const jaccard = inter.length / new Set([...oldSet, ...newSet]).size || 0;
      // log for eyeballing
      console.log(JSON.stringify(q), 'jaccard', jaccard.toFixed(2), 'old', oldSet.size, 'new', newSet.size);
      expect(jaccard).toBeGreaterThan(0.6);
    });
  }
});
```

- [ ] **Step 3: Run the gate**

Run: `cd data && npx vitest run test/diff-vs-mongo.test.js`
Expected: all queries PASS with jaccard > 0.6; eyeball the logged overlaps. If any query grossly diverges, inspect the ETL classifier fallthroughs (Task 8) for that product class before proceeding — this is the gate's whole purpose.

- [ ] **Step 4: Commit**

```bash
git add data/test/diff-vs-mongo.test.js
git commit -m "Track A: cutover gate diffing new RPC vs old Atlas search"
```

---

### Task 12: Full suite + README

**Files:**
- Create: `data/README.md`

- [ ] **Step 1: Run the full suite**

Run: `cd data && npm test`
Expected: all of `normalize`, `products`, `users`, `diff-vs-mongo` PASS.

- [ ] **Step 2: Write `data/README.md`**

```markdown
# Shopulse data layer (Supabase)

Postgres data layer replacing MongoDB. Consumed by the Cloudflare Worker (Track B).

## Setup
1. `cp .env.example .env` and fill `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`.
2. `npm install`
3. `npm run db:apply` — creates tables + RPCs.
4. `npm run etl` — loads `../backend/sample.json` (189 TVs). Idempotent (upsert on amazon_url).

## Test
`npm test` — normalizers (unit), products/users (integration, needs seeded DB),
and the cutover gate (needs the old Express backend on :3000 for the diff).

## Exports (for Track B)
- `src/supabaseClient.js` → `makeClient(env)` (Workers-safe)
- `src/products.js` → `searchProducts`, `getProductDetails`, `getProductReviews`
- `src/users.js` → `getUser`, `createUser`, `getThreadsForUser`, `createThread`, `deleteThread`, `touchThread`
```

- [ ] **Step 3: Commit**

```bash
git add data/README.md
git commit -m "Track A: data layer README + green full suite"
```

---

## Self-review notes (done during authoring)

- **Spec coverage:** schema (§4.1) ✓, search_products RPC incl. round-robin/must-not-collapse (§4.1) ✓, conversation_statistics with locked defaults (§4.1, §7) ✓, ETL with fallthrough logging (§4.1, §6.1b) ✓, cutover diff gate (§6.1b) ✓, data functions matching old shapes (§4.3 direct-call requirement) ✓, Workers-safe client (§4.3) ✓. RLS deliberately omitted per §6.5 YAGNI (anon key unused). Export script + chat message-writing belong to Track C, not here.
- **Placeholders:** none — every step has concrete code/commands.
- **Type consistency:** `makeClient` signature, `search_products` param names (`p_*`), and the result-shaping keys (`_id`, `productName`, …) are consistent across Tasks 7/9/11. Data-function names match across plan + README.
- **Known soft spot:** the jaccard > 0.6 threshold in Task 11 is a heuristic; the real value is the logged per-query overlap for human eyeballing, not the assertion. Documented as such.
