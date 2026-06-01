-- ============================================================
-- schema-goals-v2.sql
-- goals テーブルに階層化カラムを追加
-- ============================================================

-- 親目標への参照（ON DELETE CASCADE で子孫も自動削除）
alter table goals add column if not exists parent_id uuid references goals(id) on delete cascade;

-- 階層レベル: big=大目標 / annual=年間 / monthly=月間 / weekly=週間 / daily=日次
alter table goals add column if not exists period_type text default 'big'
  check (period_type in ('big', 'annual', 'monthly', 'weekly', 'daily'));

-- 期間ラベル
--   annual: 'YYYY'        例: '2026'
--   monthly: 'YYYY-MM'    例: '2026-06'
--   weekly: 'YYYY-MM-DD'  例: '2026-06-02' (その週の月曜日)
--   daily: 'YYYY-MM-DD'   例: '2026-06-02'
--   big: NULL
alter table goals add column if not exists period_label text;
