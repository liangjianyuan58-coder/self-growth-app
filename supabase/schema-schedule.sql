-- スケジュール管理機能のテーブル

-- 週間テンプレート設定（曜日ごとの空き時間）
CREATE TABLE IF NOT EXISTS schedule_settings (
  user_id    uuid PRIMARY KEY,
  weekly_template jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- 特定日のブロック（その日は無効）
CREATE TABLE IF NOT EXISTS schedule_blocks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  blocked_date date NOT NULL,
  note         text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, blocked_date)
);

-- シングルユーザーモード（RLS無効）
ALTER TABLE schedule_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_blocks   DISABLE ROW LEVEL SECURITY;
