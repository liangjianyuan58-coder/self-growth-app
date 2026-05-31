-- タスク（やること）テーブル

CREATE TABLE IF NOT EXISTS tasks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  title      text NOT NULL,
  note       text,
  done       boolean NOT NULL DEFAULT false,
  done_at    timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_tasks_ts()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tasks_ts
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_tasks_ts();
