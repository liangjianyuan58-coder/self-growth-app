-- ============================================================
-- schema-single-user.sql
-- 一人用（ログインなし）版
-- 既にテーブルを作っている場合は「RLS無効化」部分だけ実行すればOK
-- ============================================================

create extension if not exists vector;

-- --------------------------------------------------------
-- テーブル定義（user_id は auth 参照をやめて固定文字列でも入る形に）
-- --------------------------------------------------------
create table if not exists journals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  body        text not null,
  mood        smallint check (mood between 1 and 5),
  tags        text[]   default '{}',
  category    text,
  metadata    jsonb    default '{}',
  embedding   vector(1536),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  title       text not null,
  description text,
  due_date    date,
  status      text default 'active' check (status in ('active','done','archived')),
  created_at  timestamptz default now()
);

create table if not exists weekly_reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  week_start   date not null,
  summary      text,
  patterns     jsonb default '{}',
  generated_at timestamptz default now(),
  unique (user_id, week_start)
);

-- --------------------------------------------------------
-- ★重要★ RLS を無効化
-- サービスロールキーで直接読み書きするため、行レベルセキュリティは外す
-- （一人用・サーバー側からのみアクセスする前提）
-- --------------------------------------------------------
alter table journals       disable row level security;
alter table goals          disable row level security;
alter table weekly_reviews disable row level security;

-- もし以前のポリシーが残っていれば削除（エラーが出ても無視してOK）
drop policy if exists "own journals"       on journals;
drop policy if exists "own goals"          on goals;
drop policy if exists "own weekly_reviews" on weekly_reviews;

-- --------------------------------------------------------
-- updated_at トリガー
-- --------------------------------------------------------
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists journals_updated_at on journals;
create trigger journals_updated_at
  before update on journals
  for each row execute procedure handle_updated_at();

-- --------------------------------------------------------
-- セマンティック検索関数
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
