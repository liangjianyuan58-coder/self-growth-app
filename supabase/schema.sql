-- ============================================================
-- schema.sql
-- Supabase で実行する DDL
-- ============================================================

-- pgvector 有効化（セマンティック検索用）
create extension if not exists vector;

-- --------------------------------------------------------
-- journals: メインのログテーブル
-- --------------------------------------------------------
create table journals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  body        text not null,
  mood        smallint check (mood between 1 and 5),   -- 1=低 5=高
  tags        text[]   default '{}',                   -- AIが自動付与
  category    text,                                    -- journal | money | input | goal
  metadata    jsonb    default '{}',                   -- カテゴリ固有の構造データ
  embedding   vector(1536),                            -- セマンティック検索用
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- --------------------------------------------------------
-- goals: 目標テーブル
-- --------------------------------------------------------
create table goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  title       text not null,
  description text,
  due_date    date,
  status      text default 'active' check (status in ('active','done','archived')),
  created_at  timestamptz default now()
);

-- --------------------------------------------------------
-- weekly_reviews: 週次振り返りキャッシュ
-- --------------------------------------------------------
create table weekly_reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  week_start   date not null,
  summary      text,
  patterns     jsonb default '{}',   -- { strengths, struggles, money_total, inputs }
  generated_at timestamptz default now(),
  unique (user_id, week_start)
);

-- --------------------------------------------------------
-- RLS（Row Level Security）
-- --------------------------------------------------------
alter table journals       enable row level security;
alter table goals          enable row level security;
alter table weekly_reviews enable row level security;

create policy "own journals"       on journals       for all using (auth.uid() = user_id);
create policy "own goals"          on goals          for all using (auth.uid() = user_id);
create policy "own weekly_reviews" on weekly_reviews for all using (auth.uid() = user_id);

-- --------------------------------------------------------
-- updated_at 自動更新トリガー
-- --------------------------------------------------------
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger journals_updated_at
  before update on journals
  for each row execute procedure handle_updated_at();

-- --------------------------------------------------------
-- セマンティック検索用関数
-- --------------------------------------------------------
create or replace function match_journals(
  query_embedding vector(1536),
  match_user_id   uuid,
  match_count     int default 5
)
returns table (id uuid, body text, created_at timestamptz, similarity float)
language sql stable as $$
  select id, body, created_at,
         1 - (embedding <=> query_embedding) as similarity
  from journals
  where user_id = match_user_id
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
