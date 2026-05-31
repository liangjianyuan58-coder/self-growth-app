-- ============================================================
-- schema-settings.sql
-- user_settings（所持金・予算）と goals 更新トリガー追加
-- ============================================================

-- ユーザー設定テーブル
create table if not exists user_settings (
  user_id         uuid primary key,
  current_balance integer default 0,       -- 現在の所持金（円）
  monthly_budget  integer default 100000,  -- 月予算（円）
  weekly_budget   integer default 25000,   -- 週予算（円）
  updated_at      timestamptz default now()
);
alter table user_settings disable row level security;

-- goals に updated_at を追加（なければ）
alter table goals add column if not exists updated_at timestamptz default now();

-- goals の updated_at 自動更新トリガー
drop trigger if exists goals_updated_at on goals;
create trigger goals_updated_at
  before update on goals
  for each row execute procedure handle_updated_at();

-- user_settings の updated_at 自動更新トリガー
drop trigger if exists user_settings_updated_at on user_settings;
create trigger user_settings_updated_at
  before update on user_settings
  for each row execute procedure handle_updated_at();
