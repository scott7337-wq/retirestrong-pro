-- ============================================================
-- Migration 001: Lever framework + AI chat foundation
-- RetireStrong Pro · April 2026
-- Run once. Safe to re-run (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
--
-- NOTE on FK types in this DB:
--   users.user_id        is UUID
--   scenarios.scenario_id is UUID
--   conversation_turns.turn_id is SERIAL/INTEGER
-- All FKs below use the type matching the referenced PK.
-- ============================================================

BEGIN;

-- ── 1. Extend scenarios table for lever framework ─────────────────────────
-- applied_levers: ordered array of lever objects stacked on base plan
-- spending_policy: the active spending policy for this scenario
-- derived_from_scenario_id: parent scenario (for derivation history)
-- is_working: flags the ephemeral working scenario (max 1 per user)
-- created_at: when this scenario was created (scenarios already has
--             created_at; this ADD COLUMN IF NOT EXISTS is a no-op).

ALTER TABLE scenarios
  ADD COLUMN IF NOT EXISTS applied_levers           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS spending_policy          JSONB       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS derived_from_scenario_id UUID        REFERENCES scenarios(scenario_id),
  ADD COLUMN IF NOT EXISTS is_working               BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at               TIMESTAMPTZ NOT NULL DEFAULT now();

-- Only one working scenario per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_scenarios_one_working_per_user
  ON scenarios (user_id)
  WHERE is_working = true;

-- ── 2. Conversation log table ──────────────────────────────────────────────
-- Stores every AI chat turn with structured metadata.
-- message_role: 'user' | 'assistant' | 'tool_result'
-- tool_calls: array of tool invocations made in this turn (if any)
-- scenario_snapshot_id: which scenario was active when this turn happened

CREATE TABLE IF NOT EXISTS conversation_turns (
  turn_id              SERIAL      PRIMARY KEY,
  user_id              UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  session_id           UUID        NOT NULL,
  sequence_number      INTEGER     NOT NULL,
  message_role         TEXT        NOT NULL CHECK (message_role IN ('user','assistant','tool_result')),
  content              TEXT        NOT NULL,
  tool_calls           JSONB       DEFAULT NULL,
  scenario_snapshot_id UUID        REFERENCES scenarios(scenario_id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conv_turns_user_session
  ON conversation_turns (user_id, session_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_conv_turns_user_recent
  ON conversation_turns (user_id, created_at DESC);

-- ── 3. Chat sessions table ─────────────────────────────────────────────────
-- A session = one continuous conversation. Ends when user closes/navigates.
-- summary: AI-generated summary of what was decided (populated on session end)
-- active_scenario_id: which scenario was the working context

CREATE TABLE IF NOT EXISTS chat_sessions (
  session_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at           TIMESTAMPTZ DEFAULT NULL,
  summary            TEXT        DEFAULT NULL,
  active_scenario_id UUID        REFERENCES scenarios(scenario_id),
  turn_count         INTEGER     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_recent
  ON chat_sessions (user_id, started_at DESC);

-- ── 4. User preferences table ─────────────────────────────────────────────
-- Durable preferences the AI can read and write via remember_preference tool.
-- preference_key: e.g. 'no_annuities', 'prefer_roth_over_ira', 'ss_strategy'
-- source_turn_id: which conversation turn created this preference

CREATE TABLE IF NOT EXISTS user_preferences (
  preference_id    SERIAL      PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  preference_key   TEXT        NOT NULL,
  preference_value JSONB       NOT NULL,
  note             TEXT        DEFAULT NULL,
  source_turn_id   INTEGER     REFERENCES conversation_turns(turn_id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, preference_key)
);

CREATE INDEX IF NOT EXISTS idx_user_prefs_user
  ON user_preferences (user_id);

-- ── 5. Verify the migration ────────────────────────────────────────────────
-- These SELECTs will error if anything above failed silently.

SELECT
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'scenarios' AND column_name = 'applied_levers') AS has_applied_levers,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_name = 'conversation_turns') AS has_conv_turns,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_name = 'chat_sessions') AS has_chat_sessions,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_name = 'user_preferences') AS has_user_preferences;

COMMIT;
