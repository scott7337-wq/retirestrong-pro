-- ============================================================
-- Migration 004: Seed demo user profiles and plan data
-- Creates realistic independent households for demo users
-- ============================================================

BEGIN;

DO $$
DECLARE
  demo1_id UUID;
  demo2_id UUID;
  demo3_id UUID;
BEGIN

SELECT user_id INTO demo1_id FROM users WHERE email = 'demo1@test.com';
SELECT user_id INTO demo2_id FROM users WHERE email = 'demo2@test.com';
SELECT user_id INTO demo3_id FROM users WHERE email = 'demo3@test.com';

-- ── Demo 1: Karen & Tom Mitchell, ages 64/62 ──────────────
INSERT INTO profiles (
  user_id, person1_name, person1_dob, person2_name, person2_dob,
  filing_status, state_code, state_tax_rate, life_expectancy,
  monthly_spending, general_inflation, retirement_date,
  pension_monthly, part_time_income, part_time_years,
  legacy_goal, extra_spend_2027, extra_spend_2028
) VALUES (
  demo1_id, 'Karen', '1961-03-15', 'Tom', '1963-07-22',
  'mfj', 'TX', 0.0, 88,
  7500, 3.0, '2025-03-01',
  0, 0, 0, 400000, 0, 0
) ON CONFLICT (user_id) DO UPDATE SET
  person1_name = EXCLUDED.person1_name,
  person1_dob = EXCLUDED.person1_dob,
  person2_name = EXCLUDED.person2_name,
  person2_dob = EXCLUDED.person2_dob,
  filing_status = EXCLUDED.filing_status,
  monthly_spending = EXCLUDED.monthly_spending,
  life_expectancy = EXCLUDED.life_expectancy,
  retirement_date = EXCLUDED.retirement_date;

INSERT INTO social_security (user_id, person, fra_pia_monthly, claiming_age, cola_rate)
VALUES
  (demo1_id, 1, 2800, 67, 2.5),
  (demo1_id, 2, 1600, 67, 2.5)
ON CONFLICT (user_id, person) DO UPDATE SET
  fra_pia_monthly = EXCLUDED.fra_pia_monthly,
  claiming_age = EXCLUDED.claiming_age;

DELETE FROM expense_budget WHERE user_id = demo1_id;
INSERT INTO expense_budget (user_id, category, monthly_amount, is_recurring)
VALUES
  (demo1_id, 'housing',        2800, true),
  (demo1_id, 'food',           1000, true),
  (demo1_id, 'transportation',  500, true),
  (demo1_id, 'travel',         1200, true),
  (demo1_id, 'other',          2000, true);

INSERT INTO return_assumptions (user_id, asset_class, return_rate)
VALUES
  (demo1_id, 'cash_cd',  4.5),
  (demo1_id, 'tips',     1.8),
  (demo1_id, 'dividend', 6.0),
  (demo1_id, 'growth',   7.0),
  (demo1_id, 'roth',     7.0)
ON CONFLICT (user_id, asset_class) DO UPDATE SET
  return_rate = EXCLUDED.return_rate;

DELETE FROM healthcare_plan WHERE user_id = demo1_id;
INSERT INTO healthcare_plan (user_id, phase_name, annual_cost, age_start, age_end, healthcare_inflation)
VALUES
  (demo1_id, 'ACA Bridge', 24000, 65, 67, 5.0),
  (demo1_id, 'Medicare',   14000, 67, NULL, 5.0);

DELETE FROM holdings WHERE account_id IN (
  SELECT account_id FROM accounts WHERE user_id = demo1_id
);
INSERT INTO holdings (account_id, symbol, name, asset_type, current_value, quantity, last_price)
SELECT a.account_id, v.symbol, v.name, v.asset_type, v.val, 1, v.val
FROM accounts a
JOIN (VALUES
  ('ira',       'VTSAX', 'Vanguard Total Stock Mkt',  'Equity ETF', 480000),
  ('ira',       'VTIPX', 'Vanguard Inflation-Prot Sec','TIPS',       220000),
  ('roth_ira',  'VTSAX', 'Vanguard Total Stock Mkt',  'Equity ETF', 380000),
  ('brokerage', 'VMMXX', 'Vanguard Prime Money Mkt',  'Cash',       120000)
) AS v(acct_type, symbol, name, asset_type, val)
ON a.account_type = v.acct_type AND a.user_id = demo1_id;

-- ── Demo 2: James Chen, age 70, widower ───────────────────
INSERT INTO profiles (
  user_id, person1_name, person1_dob,
  filing_status, state_code, state_tax_rate, life_expectancy,
  monthly_spending, general_inflation, retirement_date,
  pension_monthly, legacy_goal
) VALUES (
  demo2_id, 'James', '1955-09-10',
  'single', 'WA', 0.0, 85,
  6000, 3.0, '2020-09-01',
  1200, 300000
) ON CONFLICT (user_id) DO UPDATE SET
  person1_name = EXCLUDED.person1_name,
  person1_dob = EXCLUDED.person1_dob,
  filing_status = EXCLUDED.filing_status,
  monthly_spending = EXCLUDED.monthly_spending,
  pension_monthly = EXCLUDED.pension_monthly;

INSERT INTO social_security (user_id, person, fra_pia_monthly, claiming_age, cola_rate)
VALUES (demo2_id, 1, 3200, 70, 2.5)
ON CONFLICT (user_id, person) DO UPDATE SET
  fra_pia_monthly = EXCLUDED.fra_pia_monthly,
  claiming_age = EXCLUDED.claiming_age;

DELETE FROM expense_budget WHERE user_id = demo2_id;
INSERT INTO expense_budget (user_id, category, monthly_amount, is_recurring)
VALUES
  (demo2_id, 'housing',         2200, true),
  (demo2_id, 'food',             800, true),
  (demo2_id, 'transportation',   400, true),
  (demo2_id, 'travel',           800, true),
  (demo2_id, 'other',           1800, true);

INSERT INTO return_assumptions (user_id, asset_class, return_rate)
VALUES
  (demo2_id, 'cash_cd',  4.5),
  (demo2_id, 'tips',     1.8),
  (demo2_id, 'dividend', 6.0),
  (demo2_id, 'growth',   7.0),
  (demo2_id, 'roth',     7.0)
ON CONFLICT (user_id, asset_class) DO UPDATE SET
  return_rate = EXCLUDED.return_rate;

DELETE FROM healthcare_plan WHERE user_id = demo2_id;
INSERT INTO healthcare_plan (user_id, phase_name, annual_cost, age_start, age_end, healthcare_inflation)
VALUES
  (demo2_id, 'Medicare', 18000, 70, NULL, 5.0);

DELETE FROM holdings WHERE account_id IN (
  SELECT account_id FROM accounts WHERE user_id = demo2_id
);
INSERT INTO holdings (account_id, symbol, name, asset_type, current_value, quantity, last_price)
SELECT a.account_id, v.symbol, v.name, v.asset_type, v.val, 1, v.val
FROM accounts a
JOIN (VALUES
  ('ira',       'VTSAX', 'Vanguard Total Stock Mkt',  'Equity ETF', 380000),
  ('ira',       'VTIPX', 'Vanguard Inflation-Prot Sec','TIPS',       180000),
  ('brokerage', 'VMMXX', 'Vanguard Prime Money Mkt',  'Cash',        95000)
) AS v(acct_type, symbol, name, asset_type, val)
ON a.account_type = v.acct_type AND a.user_id = demo2_id;

-- ── Demo 3: Linda & Robert Park, ages 58/60 ──────────────
INSERT INTO profiles (
  user_id, person1_name, person1_dob, person2_name, person2_dob,
  filing_status, state_code, state_tax_rate, life_expectancy,
  monthly_spending, general_inflation, retirement_date,
  part_time_income, part_time_years, legacy_goal
) VALUES (
  demo3_id, 'Linda', '1967-06-20', 'Robert', '1965-02-14',
  'mfj', 'CA', 9.3, 90,
  9500, 3.0, '2029-06-01',
  0, 0, 600000
) ON CONFLICT (user_id) DO UPDATE SET
  person1_name = EXCLUDED.person1_name,
  person1_dob = EXCLUDED.person1_dob,
  person2_name = EXCLUDED.person2_name,
  person2_dob = EXCLUDED.person2_dob,
  filing_status = EXCLUDED.filing_status,
  monthly_spending = EXCLUDED.monthly_spending;

INSERT INTO social_security (user_id, person, fra_pia_monthly, claiming_age, cola_rate)
VALUES
  (demo3_id, 1, 2400, 67, 2.5),
  (demo3_id, 2, 2100, 67, 2.5)
ON CONFLICT (user_id, person) DO UPDATE SET
  fra_pia_monthly = EXCLUDED.fra_pia_monthly,
  claiming_age = EXCLUDED.claiming_age;

DELETE FROM expense_budget WHERE user_id = demo3_id;
INSERT INTO expense_budget (user_id, category, monthly_amount, is_recurring)
VALUES
  (demo3_id, 'housing',        3500, true),
  (demo3_id, 'food',           1200, true),
  (demo3_id, 'transportation',  700, true),
  (demo3_id, 'travel',         2000, true),
  (demo3_id, 'other',          2100, true);

INSERT INTO return_assumptions (user_id, asset_class, return_rate)
VALUES
  (demo3_id, 'cash_cd',  4.5),
  (demo3_id, 'tips',     1.8),
  (demo3_id, 'dividend', 6.0),
  (demo3_id, 'growth',   7.0),
  (demo3_id, 'roth',     7.0)
ON CONFLICT (user_id, asset_class) DO UPDATE SET
  return_rate = EXCLUDED.return_rate;

DELETE FROM healthcare_plan WHERE user_id = demo3_id;
INSERT INTO healthcare_plan (user_id, phase_name, annual_cost, age_start, age_end, healthcare_inflation)
VALUES
  (demo3_id, 'ACA Bridge', 32000, 58, 65, 5.0),
  (demo3_id, 'Medicare',   16000, 65, NULL, 5.0);

DELETE FROM holdings WHERE account_id IN (
  SELECT account_id FROM accounts WHERE user_id = demo3_id
);
INSERT INTO holdings (account_id, symbol, name, asset_type, current_value, quantity, last_price)
SELECT a.account_id, v.symbol, v.name, v.asset_type, v.val, 1, v.val
FROM accounts a
JOIN (VALUES
  ('ira',       'VTSAX', 'Vanguard Total Stock Mkt',  'Equity ETF', 520000),
  ('ira',       'VTIPX', 'Vanguard Inflation-Prot Sec','TIPS',       280000),
  ('roth_ira',  'VTSAX', 'Vanguard Total Stock Mkt',  'Equity ETF', 310000),
  ('brokerage', 'VMMXX', 'Vanguard Prime Money Mkt',  'Cash',       190000)
) AS v(acct_type, symbol, name, asset_type, val)
ON a.account_type = v.acct_type AND a.user_id = demo3_id;

END $$;

-- Verify
SELECT u.email,
  p.person1_name, p.monthly_spending,
  COUNT(DISTINCT h.id) as holdings,
  COALESCE(SUM(h.current_value), 0) as portfolio
FROM users u
LEFT JOIN profiles p ON p.user_id = u.user_id
LEFT JOIN accounts a ON a.user_id = u.user_id
LEFT JOIN holdings h ON h.account_id = a.account_id
WHERE u.email LIKE 'demo%'
GROUP BY u.email, p.person1_name, p.monthly_spending
ORDER BY u.email;

COMMIT;
