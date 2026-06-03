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
