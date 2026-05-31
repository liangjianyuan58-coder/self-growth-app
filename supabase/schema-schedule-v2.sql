-- スケジュールイベントテーブル（v2追加）

CREATE TABLE IF NOT EXISTS schedule_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  title      text NOT NULL,
  event_date date NOT NULL,
  start_time time,
  end_time   time,
  note       text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE schedule_events DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_schedule_events_ts()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_schedule_events_ts
BEFORE UPDATE ON schedule_events
FOR EACH ROW EXECUTE FUNCTION update_schedule_events_ts();
