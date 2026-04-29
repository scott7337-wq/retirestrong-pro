-- ============================================================
-- Migration 003: Add missing profile fields
-- Fields that the Assumptions tab saves but had no DB column.
-- spouseSSAt63 intentionally excluded — "scenario-only what-if
-- input, not persisted" per App.jsx comment.
-- ============================================================

BEGIN;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pension_monthly      NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS part_time_income     NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS part_time_years      INTEGER       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS legacy_goal          NUMERIC(12,2) DEFAULT 500000,
  ADD COLUMN IF NOT EXISTS extra_spend_2027     NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_spend_2028     NUMERIC(10,2) DEFAULT 0;

SELECT
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'profiles' AND column_name = 'pension_monthly')  AS has_pension,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'profiles' AND column_name = 'legacy_goal')      AS has_legacy,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'profiles' AND column_name = 'extra_spend_2027') AS has_extra_spend;

COMMIT;
