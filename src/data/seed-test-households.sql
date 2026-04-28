-- RetireStrong Pro — Test Household Seed Data
-- Run once against the retirestrong_pro DB to set up multi-user testing.
-- INTERNAL TESTING ONLY — not for production use.

-- ── Users table ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  user_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text UNIQUE NOT NULL,
  name        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Households table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS households (
  household_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(user_id),
  name          text NOT NULL DEFAULT 'My Household',
  is_demo       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Seed test users ───────────────────────────────────────────────────────────
-- Real users (scott7337@gmail.com) are NOT in this file — they're managed separately.
-- Only demo accounts here.
INSERT INTO users (user_id, email, display_name) VALUES
  ('00000000-0000-0000-0000-000000000002', 'demo1@test.com',  'Demo Household A'),
  ('00000000-0000-0000-0000-000000000003', 'demo2@test.com',  'Demo Household B'),
  ('00000000-0000-0000-0000-000000000004', 'demo3@test.com',  'Demo Household C')
ON CONFLICT (email) DO NOTHING;

-- ── Seed households ───────────────────────────────────────────────────────────
INSERT INTO households (user_id, name, is_demo)
SELECT '00000000-0000-0000-0000-000000000002', 'Demo Household A', true
WHERE NOT EXISTS (SELECT 1 FROM households WHERE user_id = '00000000-0000-0000-0000-000000000002');

INSERT INTO households (user_id, name, is_demo)
SELECT '00000000-0000-0000-0000-000000000003', 'Demo Household B', true
WHERE NOT EXISTS (SELECT 1 FROM households WHERE user_id = '00000000-0000-0000-0000-000000000003');

INSERT INTO households (user_id, name, is_demo)
SELECT '00000000-0000-0000-0000-000000000004', 'Demo Household C', true
WHERE NOT EXISTS (SELECT 1 FROM households WHERE user_id = '00000000-0000-0000-0000-000000000004');

-- ── Seed demo accounts ───────────────────────────────────────────────────────
-- Three accounts per demo user so resolveAccountId() can match all three wizard
-- placeholder types: IRA (non-roth), Roth IRA, and Taxable/Brokerage.
-- Account names are chosen to match the regex logic in resolveAccountId():
--   "Demo IRA"        → /ira/i, not /roth/i  → maps to 'IRA'
--   "Demo Roth IRA"   → /roth/i, not /401/i  → maps to 'Roth IRA'
--   "Demo Brokerage"  → /brokerage/i         → maps to 'Taxable'
-- Fixed UUIDs make this idempotent (safe to re-run).
INSERT INTO accounts (account_id, user_id, account_name, account_type, is_active) VALUES
  -- demo1@test.com
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000002', 'Demo IRA',        'ira',       true),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000002', 'Demo Roth IRA',   'roth_ira',  true),
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000002', 'Demo Brokerage',  'brokerage', true),
  -- demo2@test.com
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000003', 'Demo IRA',        'ira',       true),
  ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000003', 'Demo Roth IRA',   'roth_ira',  true),
  ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000003', 'Demo Brokerage',  'brokerage', true),
  -- demo3@test.com
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0000-000000000004', 'Demo IRA',        'ira',       true),
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0000-000000000004', 'Demo Roth IRA',   'roth_ira',  true),
  ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0000-000000000004', 'Demo Brokerage',  'brokerage', true)
ON CONFLICT (account_id) DO NOTHING;

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT u.email, u.display_name, h.is_demo, COUNT(a.account_id) AS account_count
FROM users u
LEFT JOIN households h ON h.user_id = u.user_id
LEFT JOIN accounts a ON a.user_id = u.user_id
WHERE u.email LIKE '%@test.com'
GROUP BY u.email, u.display_name, h.is_demo
ORDER BY u.email;
