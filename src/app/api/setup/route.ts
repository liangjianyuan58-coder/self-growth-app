// src/app/api/setup/route.ts
// Supabase Management API 経由でマイグレーションを実行
// DATABASE_URL 不要 — SUPABASE_ACCESS_TOKEN だけ追加すればOK

import { NextResponse } from 'next/server'

const MIGRATIONS: Array<{ name: string; sql: string }> = [
  {
    name: '01_base_extensions',
    sql: `create extension if not exists "pgcrypto";`,
  },
  {
    name: '02_handle_updated_at_fn',
    sql: `
      create or replace function handle_updated_at()
      returns trigger language plpgsql as $$
      begin new.updated_at = now(); return new; end;
      $$;
    `,
  },
  {
    name: '03_journals',
    sql: `
      create table if not exists journals (
        id         uuid primary key default gen_random_uuid(),
        user_id    uuid not null,
        body       text not null,
        mood       smallint check (mood between 1 and 5),
        tags       text[]  default '{}',
        category   text,
        metadata   jsonb   default '{}',
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
      alter table journals disable row level security;
    `,
  },
  {
    name: '04_goals',
    sql: `
      create table if not exists goals (
        id           uuid primary key default gen_random_uuid(),
        user_id      uuid not null,
        title        text not null,
        description  text,
        due_date     date,
        status       text default 'active' check (status in ('active','done','archived')),
        created_at   timestamptz default now(),
        updated_at   timestamptz default now()
      );
      alter table goals disable row level security;
      do $$ begin
        if not exists (select 1 from pg_trigger where tgname = 'goals_updated_at') then
          create trigger goals_updated_at
            before update on goals
            for each row execute procedure handle_updated_at();
        end if;
      end $$;
    `,
  },
  {
    name: '05_goals_hierarchy',
    sql: `
      alter table goals add column if not exists parent_id    uuid references goals(id) on delete cascade;
      alter table goals add column if not exists period_type  text default 'big'
        check (period_type in ('big','annual','monthly','weekly','daily'));
      alter table goals add column if not exists period_label text;
    `,
  },
  {
    name: '06_weekly_reviews',
    sql: `
      create table if not exists weekly_reviews (
        id           uuid primary key default gen_random_uuid(),
        user_id      uuid not null,
        week_start   date not null,
        summary      text,
        patterns     jsonb default '{}',
        generated_at timestamptz default now(),
        unique (user_id, week_start)
      );
      alter table weekly_reviews disable row level security;
    `,
  },
  {
    name: '07_schedule_settings',
    sql: `
      create table if not exists schedule_settings (
        user_id         uuid primary key,
        weekly_template jsonb not null default '{}',
        updated_at      timestamptz default now()
      );
      alter table schedule_settings disable row level security;
    `,
  },
  {
    name: '08_schedule_blocks',
    sql: `
      create table if not exists schedule_blocks (
        id           uuid primary key default gen_random_uuid(),
        user_id      uuid not null,
        blocked_date date not null,
        note         text,
        created_at   timestamptz default now(),
        unique(user_id, blocked_date)
      );
      alter table schedule_blocks disable row level security;
    `,
  },
  {
    name: '09_schedule_events',
    sql: `
      create table if not exists schedule_events (
        id              uuid primary key default gen_random_uuid(),
        user_id         uuid not null,
        title           text not null,
        event_date      date not null,
        start_time      time,
        end_time        time,
        note            text,
        google_event_id text,
        created_at      timestamptz default now(),
        updated_at      timestamptz default now()
      );
      alter table schedule_events add column if not exists google_event_id text;
      alter table schedule_events disable row level security;
      create index if not exists idx_schedule_events_google_id
        on schedule_events(google_event_id) where google_event_id is not null;
      do $$ begin
        if not exists (select 1 from pg_trigger where tgname = 'trg_schedule_events_ts') then
          create trigger trg_schedule_events_ts
            before update on schedule_events
            for each row execute function handle_updated_at();
        end if;
      end $$;
    `,
  },
  {
    name: '10_tasks',
    sql: `
      create table if not exists tasks (
        id         uuid primary key default gen_random_uuid(),
        user_id    uuid not null,
        title      text not null,
        note       text,
        done       boolean not null default false,
        done_at    timestamptz,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
      alter table tasks disable row level security;
      do $$ begin
        if not exists (select 1 from pg_trigger where tgname = 'trg_tasks_ts') then
          create trigger trg_tasks_ts
            before update on tasks
            for each row execute function handle_updated_at();
        end if;
      end $$;
    `,
  },
  {
    name: '11_user_settings',
    sql: `
      create table if not exists user_settings (
        user_id         uuid primary key,
        current_balance integer default 0,
        monthly_budget  integer default 100000,
        weekly_budget   integer default 25000,
        updated_at      timestamptz default now()
      );
      alter table user_settings disable row level security;
      do $$ begin
        if not exists (select 1 from pg_trigger where tgname = 'user_settings_updated_at') then
          create trigger user_settings_updated_at
            before update on user_settings
            for each row execute procedure handle_updated_at();
        end if;
      end $$;
    `,
  },
  {
    name: '12_worksheet_answers',
    sql: `
      create table if not exists worksheet_answers (
        user_id    uuid primary key,
        answers    jsonb not null default '{}',
        updated_at timestamptz default now()
      );
      alter table worksheet_answers disable row level security;
      do $$ begin
        if not exists (select 1 from pg_trigger where tgname = 'worksheet_answers_updated_at') then
          create trigger worksheet_answers_updated_at
            before update on worksheet_answers
            for each row execute procedure handle_updated_at();
        end if;
      end $$;
    `,
  },
]

function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? ''
}

async function execSQL(
  projectRef: string,
  token: string,
  sql: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ query: sql }),
    },
  )
  if (res.ok) return { ok: true }
  const data = await res.json() as { message?: string }
  return { ok: false, error: data.message ?? `HTTP ${res.status}` }
}

export async function POST() {
  const token      = process.env.SUPABASE_ACCESS_TOKEN
  const projectRef = getProjectRef()

  if (!token) {
    return NextResponse.json(
      { error: 'SUPABASE_ACCESS_TOKEN が設定されていません。Vercel の環境変数に追加してください。' },
      { status: 500 },
    )
  }
  if (!projectRef) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_URL から projectRef を取得できませんでした。' },
      { status: 500 },
    )
  }

  const results: Array<{ name: string; ok: boolean; error?: string }> = []

  for (const m of MIGRATIONS) {
    const result = await execSQL(projectRef, token, m.sql)
    results.push({ name: m.name, ...result })
  }

  const failed = results.filter(r => !r.ok)
  return NextResponse.json(
    { results, success: failed.length === 0, failed: failed.length },
    { status: failed.length > 0 ? 207 : 200 },
  )
}

export async function GET() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  return NextResponse.json({
    ready: !!token,
    message: token
      ? 'SUPABASE_ACCESS_TOKEN が設定されています。'
      : 'SUPABASE_ACCESS_TOKEN が未設定です。Supabase → Account → Access Tokens でトークンを作成して Vercel 環境変数に追加してください。',
  })
}
