-- Google Calendar 連携用カラム追加（v3）

ALTER TABLE schedule_events ADD COLUMN IF NOT EXISTS google_event_id text;
CREATE INDEX IF NOT EXISTS idx_schedule_events_google_id ON schedule_events(google_event_id) WHERE google_event_id IS NOT NULL;
