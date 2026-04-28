// ============================================================================
// RetireStrong v14 — WRITE routes (Phase 1)
// ============================================================================
//
// Companion to retirestrong-v14-routes.cjs (which defines the GET routes).
// This file adds all the PUT/POST/DELETE routes needed for the v14 client
// to persist user edits back to PostgreSQL.
//
// HOW TO USE — add these lines to server.cjs after the GET routes:
//
//   const addV14Writes = require('./retirestrong-v14-writes.cjs');
//   addV14Writes(app, pool);
//
// DESIGN NOTES
// ─────────────
// • Every route that updates by a natural key (not by surrogate id) uses
//   ON CONFLICT DO UPDATE so the same endpoint handles both create and update.
//   This makes the client code simpler: setField() just fires PUT and doesn't
//   care whether the row already exists.
// • healthcare_plan, qcd_config, market_assumptions have no unique constraint
//   in the schema, so they're handled with an UPDATE-first fallback pattern.
// • All responses return the full updated row so the client can confirm.
// • All queries are parameterized — no SQL injection risk.
// • Every handler wraps in try/catch and returns { error } with 400/500.
// ============================================================================

module.exports = function addV14Writes(app, pool) {

  // ── Helpers ────────────────────────────────────────────────────────────────
  function uid(req, res) {
    const id = req.query.user_id || req.body?.user_id;
    if (!id) { res.status(400).json({ error: 'user_id required' }); return null; }
    return id;
  }

  function badRequest(res, msg) { return res.status(400).json({ error: msg }); }
  function serverError(res, err) {
    console.error('[v14-writes] error:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }

  // ── Profile (UPDATE — row always exists, keyed by user_id) ─────────────────
  app.put('/api/profile', async (req, res) => {
    const u = uid(req, res); if (!u) return;
    const b = req.body || {};
    const allowed = [
      'person1_name', 'person1_dob', 'person2_name', 'person2_dob',
      'filing_status', 'state_code', 'state_tax_rate', 'state_ss_exempt',
      'life_expectancy', 'monthly_spending', 'general_inflation',
      'retirement_date', 'base_year', 'survivor_mode', 'surviving_person'
    ];
    const sets = [];
    const vals = [u];
    let idx = 2;
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(b, k)) {
        sets.push(`${k} = $${idx++}`);
        vals.push(b[k]);
      }
    }
    if (!sets.length) return badRequest(res, 'no updatable fields in body');
    sets.push('updated_at = now()');
    const sql = `UPDATE profiles SET ${sets.join(', ')} WHERE user_id = $1 RETURNING *`;
    try {
      const { rows } = await pool.query(sql, vals);
      if (!rows.length) return res.status(404).json({ error: 'Profile not found' });
      res.json(rows[0]);
    } catch (e) { serverError(res, e); }
  });

  // ── Social Security (UPSERT — keyed by user_id + person) ───────────────────
  app.put('/api/social_security/:person', async (req, res) => {
    const u = uid(req, res); if (!u) return;
    const person = parseInt(req.params.person, 10);
    if (person !== 1 && person !== 2) return badRequest(res, 'person must be 1 or 2');
    const b = req.body || {};
    const fra = b.fra_pia_monthly;
    const claiming = b.claiming_age;
    const cola = b.cola_rate;
    const benefit = b.benefit_type || 'worker';
    const startDate = b.start_date || null;
    const firstYearMonths = b.first_year_months === undefined ? null : b.first_year_months;
    const isActive = b.is_active === undefined ? true : !!b.is_active;
    if (fra === undefined || claiming === undefined || cola === undefined) {
      return badRequest(res, 'fra_pia_monthly, claiming_age, and cola_rate are required');
    }
    try {
      const { rows } = await pool.query(`
        INSERT INTO social_security
          (user_id, person, benefit_type, fra_pia_monthly, claiming_age, cola_rate,
           start_date, first_year_months, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (user_id, person) DO UPDATE SET
          benefit_type = EXCLUDED.benefit_type,
          fra_pia_monthly = EXCLUDED.fra_pia_monthly,
          claiming_age = EXCLUDED.claiming_age,
          cola_rate = EXCLUDED.cola_rate,
          start_date = EXCLUDED.start_date,
          first_year_months = EXCLUDED.first_year_months,
          is_active = EXCLUDED.is_active,
          updated_at = now()
        RETURNING *`,
        [u, person, benefit, fra, claiming, cola, startDate, firstYearMonths, isActive]);
      res.json(rows[0]);
    } catch (e) { serverError(res, e); }
  });

  // ── Roth Conversion Plan (UPSERT — keyed by user_id + year) ────────────────
  app.put('/api/roth_plan/:year', async (req, res) => {
    const u = uid(req, res); if (!u) return;
    const year = parseInt(req.params.year, 10);
    if (!year || year < 2000 || year > 2100) return badRequest(res, 'invalid year');
    const b = req.body || {};
    const planned = b.planned_amount;
    if (planned === undefined) return badRequest(res, 'planned_amount required');
    const actual = b.actual_amount === undefined ? null : b.actual_amount;
    const priority = b.source_priority || 'growth_first';
    const executed = b.executed === undefined ? false : !!b.executed;
    const notes = b.notes || null;
    try {
      const { rows } = await pool.query(`
        INSERT INTO roth_conversion_plan
          (user_id, year, planned_amount, actual_amount, source_priority, executed, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, year) DO UPDATE SET
          planned_amount = EXCLUDED.planned_amount,
          actual_amount = EXCLUDED.actual_amount,
          source_priority = EXCLUDED.source_priority,
          executed = EXCLUDED.executed,
          notes = EXCLUDED.notes
        RETURNING *`,
        [u, year, planned, actual, priority, executed, notes]);
      res.json(rows[0]);
    } catch (e) { serverError(res, e); }
  });

  // ── Return Assumptions (UPSERT — keyed by user_id + asset_class) ───────────
  app.put('/api/returns/:asset_class', async (req, res) => {
    const u = uid(req, res); if (!u) return;
    const ac = req.params.asset_class;
    if (!ac) return badRequest(res, 'asset_class required in path');
    const b = req.body || {};
    const rate = b.return_rate;
    if (rate === undefined) return badRequest(res, 'return_rate required');
    const retType = b.return_type || 'nominal';
    const realSpread = b.real_spread === undefined ? null : b.real_spread;
    const notes = b.notes || null;
    try {
      const { rows } = await pool.query(`
        INSERT INTO return_assumptions
          (user_id, asset_class, return_rate, return_type, real_spread, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, asset_class) DO UPDATE SET
          return_rate = EXCLUDED.return_rate,
          return_type = EXCLUDED.return_type,
          real_spread = EXCLUDED.real_spread,
          notes = EXCLUDED.notes,
          updated_at = now()
        RETURNING *`,
        [u, ac, rate, retType, realSpread, notes]);
      res.json(rows[0]);
    } catch (e) { serverError(res, e); }
  });

  // ── Healthcare (UPDATE by id — no unique constraint exists) ────────────────
  app.put('/api/healthcare/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return badRequest(res, 'id required');
    const b = req.body || {};
    const allowed = ['phase_name', 'annual_cost', 'healthcare_inflation',
                     'age_start', 'age_end', 'notes'];
    const sets = [];
    const vals = [id];
    let idx = 2;
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(b, k)) {
        sets.push(`${k} = $${idx++}`);
        vals.push(b[k]);
      }
    }
    if (!sets.length) return badRequest(res, 'no updatable fields in body');
    sets.push('updated_at = now()');
    try {
      const { rows } = await pool.query(
        `UPDATE healthcare_plan SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, vals);
      if (!rows.length) return res.status(404).json({ error: 'Healthcare row not found' });
      res.json(rows[0]);
    } catch (e) { serverError(res, e); }
  });

  // ── Expenses (UPDATE by user_id + category — no unique constraint, but
  //     we treat (user_id, category, is_recurring=true) as unique logically) ──
  app.put('/api/expenses/:category', async (req, res) => {
    const u = uid(req, res); if (!u) return;
    const cat = req.params.category;
    if (!cat) return badRequest(res, 'category required');
    const b = req.body || {};
    const amt = b.monthly_amount;
    if (amt === undefined) return badRequest(res, 'monthly_amount required');
    const notes = b.notes || null;
    try {
      // Try update first
      const upd = await pool.query(
        `UPDATE expense_budget
         SET monthly_amount = $3, notes = $4, updated_at = now()
         WHERE user_id = $1 AND category = $2 AND is_recurring = true
         RETURNING *`,
        [u, cat, amt, notes]);
      if (upd.rows.length) return res.json(upd.rows[0]);
      // No existing row — insert
      const ins = await pool.query(
        `INSERT INTO expense_budget
           (user_id, category, monthly_amount, is_recurring, notes)
         VALUES ($1, $2, $3, true, $4)
         RETURNING *`,
        [u, cat, amt, notes]);
      res.json(ins.rows[0]);
    } catch (e) { serverError(res, e); }
  });

  // ── App Settings (UPSERT — keyed by user_id) ───────────────────────────────
  app.put('/api/app_settings', async (req, res) => {
    const u = uid(req, res); if (!u) return;
    const b = req.body || {};
    const theme = b.theme || 'light';
    const defaultTab = b.default_tab || null;
    const mcRuns = b.monte_carlo_runs === undefined ? 1000 : b.monte_carlo_runs;
    const colors = b.chart_color_scheme || null;
    const showCents = b.show_cents === undefined ? false : !!b.show_cents;
    const currency = b.currency || 'USD';
    try {
      const { rows } = await pool.query(`
        INSERT INTO app_settings
          (user_id, theme, default_tab, monte_carlo_runs, chart_color_scheme, show_cents, currency)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id) DO UPDATE SET
          theme = EXCLUDED.theme,
          default_tab = EXCLUDED.default_tab,
          monte_carlo_runs = EXCLUDED.monte_carlo_runs,
          chart_color_scheme = EXCLUDED.chart_color_scheme,
          show_cents = EXCLUDED.show_cents,
          currency = EXCLUDED.currency,
          updated_at = now()
        RETURNING *`,
        [u, theme, defaultTab, mcRuns, colors, showCents, currency]);
      res.json(rows[0]);
    } catch (e) { serverError(res, e); }
  });

  // ── Market Assumptions (UPDATE the active row for user) ────────────────────
  app.put('/api/market_assumptions', async (req, res) => {
    const u = uid(req, res); if (!u) return;
    const b = req.body || {};
    const allowed = ['cape_ratio', 'ten_yr_treasury', 'tips_yield', 'ss_cola_rate', 'label'];
    const sets = [];
    const vals = [u];
    let idx = 2;
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(b, k)) {
        sets.push(`${k} = $${idx++}`);
        vals.push(b[k]);
      }
    }
    if (!sets.length) return badRequest(res, 'no updatable fields in body');
    sets.push('updated_at = now()');
    try {
      // Try update active row first
      const upd = await pool.query(
        `UPDATE market_assumptions SET ${sets.join(', ')}
         WHERE user_id = $1 AND is_active = true RETURNING *`, vals);
      if (upd.rows.length) return res.json(upd.rows[0]);
      // No active row — insert one with defaults + supplied values
      const cols = ['user_id', 'is_active'];
      const insVals = [u, true];
      const phs = ['$1', '$2'];
      let p = 3;
      for (const k of allowed) {
        if (Object.prototype.hasOwnProperty.call(b, k)) {
          cols.push(k); insVals.push(b[k]); phs.push(`$${p++}`);
        }
      }
      const ins = await pool.query(
        `INSERT INTO market_assumptions (${cols.join(', ')}) VALUES (${phs.join(', ')}) RETURNING *`,
        insVals);
      res.json(ins.rows[0]);
    } catch (e) { serverError(res, e); }
  });

  // ── QCD Config (UPDATE the single row for user; create if missing) ─────────
  app.put('/api/qcd_config', async (req, res) => {
    const u = uid(req, res); if (!u) return;
    const b = req.body || {};
    const allowed = ['start_age', 'annual_amount', 'source_priority', 'max_pct_of_ira'];
    const sets = [];
    const vals = [u];
    let idx = 2;
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(b, k)) {
        sets.push(`${k} = $${idx++}`);
        vals.push(b[k]);
      }
    }
    if (!sets.length) return badRequest(res, 'no updatable fields in body');
    sets.push('updated_at = now()');
    try {
      const upd = await pool.query(
        `UPDATE qcd_config SET ${sets.join(', ')} WHERE user_id = $1 RETURNING *`, vals);
      if (upd.rows.length) return res.json(upd.rows[0]);
      // insert if no existing row
      const cols = ['user_id'];
      const insVals = [u];
      const phs = ['$1'];
      let p = 2;
      for (const k of allowed) {
        if (Object.prototype.hasOwnProperty.call(b, k)) {
          cols.push(k); insVals.push(b[k]); phs.push(`$${p++}`);
        }
      }
      const ins = await pool.query(
        `INSERT INTO qcd_config (${cols.join(', ')}) VALUES (${phs.join(', ')}) RETURNING *`,
        insVals);
      res.json(ins.rows[0]);
    } catch (e) { serverError(res, e); }
  });

  // ── Bucket Config (UPSERT — keyed by user_id + bucket_number) ──────────────
  app.put('/api/bucket_config/:bucket_number', async (req, res) => {
    const u = uid(req, res); if (!u) return;
    const bn = parseInt(req.params.bucket_number, 10);
    if (bn < 1 || bn > 3) return badRequest(res, 'bucket_number must be 1, 2, or 3');
    const b = req.body || {};
    const label = b.label;
    const target = b.target_amount;
    const yrStart = b.year_range_start;
    const yrEnd = b.year_range_end;
    const bear = b.bear_market_rule || null;
    const refill = b.refill_rule || null;
    const notes = b.notes || null;
    if (label === undefined || target === undefined || yrStart === undefined || yrEnd === undefined) {
      return badRequest(res, 'label, target_amount, year_range_start, year_range_end required');
    }
    try {
      const { rows } = await pool.query(`
        INSERT INTO bucket_config
          (user_id, bucket_number, label, target_amount, year_range_start, year_range_end,
           bear_market_rule, refill_rule, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (user_id, bucket_number) DO UPDATE SET
          label = EXCLUDED.label,
          target_amount = EXCLUDED.target_amount,
          year_range_start = EXCLUDED.year_range_start,
          year_range_end = EXCLUDED.year_range_end,
          bear_market_rule = EXCLUDED.bear_market_rule,
          refill_rule = EXCLUDED.refill_rule,
          notes = EXCLUDED.notes,
          updated_at = now()
        RETURNING *`,
        [u, bn, label, target, yrStart, yrEnd, bear, refill, notes]);
      res.json(rows[0]);
    } catch (e) { serverError(res, e); }
  });

  // ── Holdings: Create new ───────────────────────────────────────────────────
  // Client sends: { account (string like "IRA" / "Roth IRA" / "Taxable"),
  //                 symbol, name, amount, type, bucket, quantity, maturity_date }
  // We resolve account string → account_id UUID using the mapAccount reverse logic.
  app.post('/api/holdings', async (req, res) => {
    const u = uid(req, res); if (!u) return;
    const b = req.body || {};
    const accountStr = b.account;
    if (!accountStr) return badRequest(res, 'account required (e.g. "IRA", "Roth IRA", "Taxable")');
    if (!b.symbol && !b.name) return badRequest(res, 'symbol or name required');
    try {
      // Find matching account_id for this user based on the account string
      const acctId = await resolveAccountId(pool, u, accountStr);
      if (!acctId) return res.status(404).json({ error: `No account matching "${accountStr}" for user` });

      const { rows } = await pool.query(`
        INSERT INTO holdings
          (account_id, symbol, name, quantity, last_price, current_value, cost_basis,
           maturity_date, asset_type, bucket, risk_level, as_of_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_DATE)
        RETURNING *`,
        [acctId,
         b.symbol || b.name,
         b.name || b.symbol,
         b.quantity === undefined ? null : b.quantity,
         b.last_price === undefined ? null : b.last_price,
         b.amount === undefined ? null : b.amount,
         b.cost_basis === undefined ? null : b.cost_basis,
         b.maturity_date || null,
         b.type || b.asset_type || null,
         b.bucket === undefined ? null : b.bucket,
         b.risk_level || b.risk || null]);
      res.json(formatHolding(rows[0], accountStr));
    } catch (e) { serverError(res, e); }
  });

  // ── Holdings: Update any fields ────────────────────────────────────────────
  app.put('/api/holdings/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return badRequest(res, 'id required');
    const b = req.body || {};
    const fieldMap = {
      symbol: 'symbol', name: 'name',
      quantity: 'quantity', last_price: 'last_price',
      amount: 'current_value', current_value: 'current_value',
      cost_basis: 'cost_basis', maturity_date: 'maturity_date',
      type: 'asset_type', asset_type: 'asset_type',
      bucket: 'bucket', risk_level: 'risk_level', risk: 'risk_level'
    };
    const sets = [];
    const vals = [id];
    let idx = 2;
    for (const clientKey in fieldMap) {
      if (Object.prototype.hasOwnProperty.call(b, clientKey)) {
        const dbCol = fieldMap[clientKey];
        // avoid duplicating when both e.g. amount and current_value were sent
        if (!sets.some(s => s.startsWith(dbCol + ' '))) {
          sets.push(`${dbCol} = $${idx++}`);
          vals.push(b[clientKey]);
        }
      }
    }
    if (!sets.length) return badRequest(res, 'no updatable fields in body');
    sets.push('updated_at = now()');
    // Scope to req.userId so a user cannot edit another user's holding by guessing an id
    vals.push(req.userId);
    const userIdx = idx;
    try {
      const { rows } = await pool.query(
        `UPDATE holdings SET ${sets.join(', ')} WHERE id = $1 AND account_id IN (SELECT account_id FROM accounts WHERE user_id = $${userIdx}) RETURNING *`, vals);
      if (!rows.length) return res.status(404).json({ error: 'Holding not found' });
      // Lookup account_name for formatted response
      const accRes = await pool.query(
        `SELECT a.account_name FROM accounts a WHERE a.account_id = $1`, [rows[0].account_id]);
      const accountStr = accRes.rows[0]?.account_name || 'Unknown';
      res.json(formatHolding(rows[0], accountStr));
    } catch (e) { serverError(res, e); }
  });

  // ── Holdings: Fast path for bucket assignment only ─────────────────────────
  app.put('/api/holdings/:id/bucket', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return badRequest(res, 'id required');
    const bucket = req.body?.bucket;
    // bucket can be null (unassigned) or 1/2/3
    if (bucket !== null && bucket !== undefined && ![1, 2, 3].includes(parseInt(bucket, 10))) {
      return badRequest(res, 'bucket must be 1, 2, 3, or null');
    }
    const val = bucket === null || bucket === undefined ? null : parseInt(bucket, 10);
    try {
      const { rows } = await pool.query(
        `UPDATE holdings SET bucket = $2, updated_at = now() WHERE id = $1 AND account_id IN (SELECT account_id FROM accounts WHERE user_id = $3) RETURNING *`,
        [id, val, req.userId]);
      if (!rows.length) return res.status(404).json({ error: 'Holding not found' });
      res.json({ id: 'db' + rows[0].id, bucket: rows[0].bucket });
    } catch (e) { serverError(res, e); }
  });

  // ── Holdings: Delete ───────────────────────────────────────────────────────
  app.delete('/api/holdings/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return badRequest(res, 'id required');
    try {
      const { rows } = await pool.query(
        `DELETE FROM holdings WHERE id = $1 AND account_id IN (SELECT account_id FROM accounts WHERE user_id = $2) RETURNING id`,
        [id, req.userId]);
      if (!rows.length) return res.status(404).json({ error: 'Holding not found' });
      res.json({ deleted: true, id: 'db' + rows[0].id });
    } catch (e) { serverError(res, e); }
  });

  // ── Income Tracking: GET all fields for a year ──────────────────────────────
  app.get('/api/income_tracking', async (req, res) => {
    const u = uid(req, res); if (!u) return;
    const year = parseInt(req.query.year || '2026', 10);
    try {
      const { rows } = await pool.query(
        'SELECT field_key, amount FROM income_tracking WHERE user_id = $1 AND year = $2',
        [u, year]);
      // Return as a flat object: { incW2: 45000, incSeverance: 30000, ... }
      const obj = {};
      rows.forEach(r => { obj[r.field_key] = parseFloat(r.amount); });
      res.json(obj);
    } catch (e) { serverError(res, e); }
  });

  // ── Income Tracking: UPSERT a single field ─────────────────────────────────
  app.put('/api/income_tracking/:field_key', async (req, res) => {
    const u = uid(req, res); if (!u) return;
    const fk = req.params.field_key;
    if (!fk) return badRequest(res, 'field_key required');
    const b = req.body || {};
    const year = parseInt(b.year || '2026', 10);
    const amount = b.amount === undefined ? 0 : parseFloat(b.amount);
    const notes = b.notes || null;
    try {
      const { rows } = await pool.query(`
        INSERT INTO income_tracking (user_id, year, field_key, amount, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, year, field_key) DO UPDATE SET
          amount = EXCLUDED.amount,
          notes = EXCLUDED.notes,
          updated_at = now()
        RETURNING *`,
        [u, year, fk, amount, notes]);
      res.json(rows[0]);
    } catch (e) { serverError(res, e); }
  });

  // ── Spending Actuals: GET all months for a year ────────────────────────────
  app.get('/api/spending_actuals', async (req, res) => {
    const u = uid(req, res); if (!u) return;
    const year = parseInt(req.query.year || '2026', 10);
    try {
      const { rows } = await pool.query(
        'SELECT month, amount FROM spending_actuals WHERE user_id = $1 AND year = $2 ORDER BY month',
        [u, year]);
      // Return as object keyed by month name: { jan: 7500, feb: 8200, ... }
      const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      const obj = {};
      rows.forEach(r => { obj[monthNames[r.month - 1]] = parseFloat(r.amount); });
      res.json(obj);
    } catch (e) { serverError(res, e); }
  });

  // ── Spending Actuals: UPSERT a single month ────────────────────────────────
  app.put('/api/spending_actuals/:month', async (req, res) => {
    const u = uid(req, res); if (!u) return;
    const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const monthStr = req.params.month.toLowerCase();
    const monthNum = monthNames.indexOf(monthStr) + 1;
    if (monthNum < 1) return badRequest(res, 'Invalid month: ' + monthStr);
    const b = req.body || {};
    const year = parseInt(b.year || '2026', 10);
    const amount = b.amount === undefined ? 0 : parseFloat(b.amount);
    const notes = b.notes || null;
    try {
      const { rows } = await pool.query(`
        INSERT INTO spending_actuals (user_id, year, month, amount, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, year, month) DO UPDATE SET
          amount = EXCLUDED.amount,
          notes = EXCLUDED.notes,
          updated_at = now()
        RETURNING *`,
        [u, year, monthNum, amount, notes]);
      res.json(rows[0]);
    } catch (e) { serverError(res, e); }
  });

  console.log('  ✅ RetireStrong v14 WRITE routes loaded (18 endpoints: 14 Phase 1 + 4 Phase 3)');
};

// ── Helpers (outside the exported function so they're module-private) ────────

// Map a client-side short account string ("IRA", "Roth IRA", "Taxable", "Roth 401k")
// back to an account_id UUID. Mirrors the mapAccount() logic in server.cjs.
async function resolveAccountId(pool, userId, accountStr) {
  const n = (accountStr || '').toLowerCase();
  const { rows } = await pool.query(
    `SELECT account_id, account_name FROM accounts WHERE user_id = $1 AND is_active = true`,
    [userId]);
  // Priority match — most specific first
  if (n.includes('roth 401')) {
    const m = rows.find(r => /roth.*401|oracle/i.test(r.account_name));
    if (m) return m.account_id;
  }
  if (n.includes('roth')) {
    const m = rows.find(r => /roth/i.test(r.account_name) && !/401/i.test(r.account_name));
    if (m) return m.account_id;
  }
  if (n.includes('taxable') || n.includes('brokerage')) {
    const m = rows.find(r => /brokerage|taxable/i.test(r.account_name));
    if (m) return m.account_id;
  }
  if (n === 'ira' || n.includes('ira')) {
    const m = rows.find(r => /ira/i.test(r.account_name) && !/roth/i.test(r.account_name));
    if (m) return m.account_id;
  }
  return null;
}

// Format a DB holdings row back into the client-friendly shape (same as GET /api/holdings)
function formatHolding(r, accountStr) {
  return {
    id: 'db' + r.id,
    name: r.name || r.symbol,
    symbol: r.symbol,
    amount: parseFloat(r.current_value) || 0,
    type: r.asset_type || 'Cash',
    account: mapAccountBack(accountStr),
    bucket: r.bucket || null,
    shares: r.quantity ? parseFloat(r.quantity) : null,
    maturity: r.maturity_date ? new Date(r.maturity_date).toLocaleDateString('en-US', {month:'short', year:'numeric'}) : 'Liquid',
    yld: '—',
    risk: r.risk_level || 'Low',
    as_of_date: r.as_of_date,
  };
}

// Mirror of the mapAccount() in server.cjs so the response shape matches GET /api/holdings
function mapAccountBack(accountName) {
  if (!accountName) return 'IRA';
  const n = accountName.toLowerCase();
  if (n.includes('roth 401') || n.includes('oracle')) return 'Roth 401k';
  if (n.includes('roth'))     return 'Roth IRA';
  if (n.includes('brokerage') || n.includes('taxable')) return 'Taxable';
  if (n.includes('ira'))      return 'IRA';
  return accountName;
}
