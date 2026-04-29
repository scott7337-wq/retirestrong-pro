-- Migration 002: Add working scenario support to scenarios table
-- Adds is_working flag, applied_levers JSONB, and a unique partial index
-- so each user can have at most one active working scenario at a time.

ALTER TABLE scenarios
  ADD COLUMN IF NOT EXISTS is_working     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS applied_levers jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS spending_policy jsonb  NULL;

-- Unique partial index: only one working scenario per user
CREATE UNIQUE INDEX IF NOT EXISTS scenarios_one_working_per_user
  ON scenarios (user_id)
  WHERE is_working = true;
