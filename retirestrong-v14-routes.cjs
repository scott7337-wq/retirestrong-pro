// ============================================================================
// RetireStrong v14 — New API Routes
// ============================================================================
//
// HOW TO USE — just 2 lines in your existing server.js:
//
//   1. Put this file next to your server.js (same folder)
//
//   2. Add these 2 lines ANYWHERE after your `app` and `pool` are created
//      but BEFORE your app.listen():
//
//        const addV14Routes = require("./retirestrong-v14-routes");
//        addV14Routes(app, pool);
//
//   That's it. All 17 new endpoints will be live alongside your existing ones.
//   Your existing /api/holdings endpoint stays untouched.
//
// ============================================================================

module.exports = function addV14Routes(app, pool) {

  // Helper
  function uid(req, res) {
    const id = req.query.user_id || req.body?.user_id;
    if (!id) { res.status(400).json({ error: "user_id required" }); return null; }
    return id;
  }

  // ── Profile ─────────────────────────────────────────────────────────────
  app.get("/api/profile", async (req, res) => {
    const u = uid(req, res); if (!u) return;
    try {
      const { rows } = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [u]);
      if (!rows.length) return res.status(404).json({ error: "Profile not found" });
      const p = rows[0];
      p.state_tax_rate = parseFloat(p.state_tax_rate);
      p.monthly_spending = parseFloat(p.monthly_spending);
      p.general_inflation = parseFloat(p.general_inflation);
      res.json(p);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Social Security ─────────────────────────────────────────────────────
  app.get("/api/social_security", async (req, res) => {
    const u = uid(req, res); if (!u) return;
    try {
      const { rows } = await pool.query(
        "SELECT * FROM social_security WHERE user_id = $1 AND is_active = true ORDER BY person", [u]
      );
      rows.forEach(r => { r.fra_pia_monthly = parseFloat(r.fra_pia_monthly); r.cola_rate = parseFloat(r.cola_rate); });
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Roth Conversion Plan ────────────────────────────────────────────────
  app.get("/api/roth_plan", async (req, res) => {
    const u = uid(req, res); if (!u) return;
    try {
      const { rows } = await pool.query(
        "SELECT * FROM roth_conversion_plan WHERE user_id = $1 ORDER BY year", [u]
      );
      rows.forEach(r => { r.planned_amount = parseFloat(r.planned_amount); });
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Bucket Config ───────────────────────────────────────────────────────
  app.get("/api/bucket_config", async (req, res) => {
    const u = uid(req, res); if (!u) return;
    try {
      const { rows } = await pool.query(
        "SELECT * FROM bucket_config WHERE user_id = $1 ORDER BY bucket_number", [u]
      );
      rows.forEach(r => { r.target_amount = parseFloat(r.target_amount); });
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Healthcare ──────────────────────────────────────────────────────────
  app.get("/api/healthcare", async (req, res) => {
    const u = uid(req, res); if (!u) return;
    try {
      const { rows } = await pool.query(
        "SELECT * FROM healthcare_plan WHERE user_id = $1 ORDER BY age_start", [u]
      );
      rows.forEach(r => { r.annual_cost = parseFloat(r.annual_cost); r.healthcare_inflation = parseFloat(r.healthcare_inflation); });
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Return Assumptions ──────────────────────────────────────────────────
  app.get("/api/returns", async (req, res) => {
    const u = uid(req, res); if (!u) return;
    try {
      const { rows } = await pool.query(
        "SELECT * FROM return_assumptions WHERE user_id = $1", [u]
      );
      rows.forEach(r => { r.return_rate = parseFloat(r.return_rate); });
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Expenses ────────────────────────────────────────────────────────────
  app.get("/api/expenses", async (req, res) => {
    const u = uid(req, res); if (!u) return;
    try {
      const { rows } = await pool.query(
        "SELECT * FROM expense_budget WHERE user_id = $1 AND is_recurring = true ORDER BY category", [u]
      );
      rows.forEach(r => { r.monthly_amount = parseFloat(r.monthly_amount); });
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Scenarios ───────────────────────────────────────────────────────────
  app.get("/api/scenarios", async (req, res) => {
    const u = uid(req, res); if (!u) return;
    try {
      const { rows } = await pool.query(
        "SELECT * FROM scenarios WHERE user_id = $1 AND is_active = true ORDER BY is_default DESC, name", [u]
      );
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/scenario_overrides/:scenarioId", async (req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM scenario_overrides WHERE scenario_id = $1", [req.params.scenarioId]
      );
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Withdrawal Sequence ─────────────────────────────────────────────────
  app.get("/api/withdrawal_sequence", async (req, res) => {
    const u = uid(req, res); if (!u) return;
    try {
      const { rows } = await pool.query(
        "SELECT * FROM withdrawal_sequence WHERE user_id = $1 ORDER BY priority", [u]
      );
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── QCD Config ──────────────────────────────────────────────────────────
  app.get("/api/qcd_config", async (req, res) => {
    const u = uid(req, res); if (!u) return;
    try {
      const { rows } = await pool.query("SELECT * FROM qcd_config WHERE user_id = $1", [u]);
      if (!rows.length) return res.json(null);
      const r = rows[0];
      r.annual_amount = parseFloat(r.annual_amount);
      r.max_pct_of_ira = parseFloat(r.max_pct_of_ira);
      res.json(r);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Market Assumptions ──────────────────────────────────────────────────
  app.get("/api/market_assumptions", async (req, res) => {
    const u = uid(req, res); if (!u) return;
    try {
      const { rows } = await pool.query(
        "SELECT * FROM market_assumptions WHERE user_id = $1 AND is_active = true LIMIT 1", [u]
      );
      if (!rows.length) return res.json(null);
      const r = rows[0];
      r.cape_ratio = parseFloat(r.cape_ratio);
      r.ten_yr_treasury = parseFloat(r.ten_yr_treasury);
      r.tips_yield = parseFloat(r.tips_yield);
      r.ss_cola_rate = parseFloat(r.ss_cola_rate);
      res.json(r);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── App Settings ────────────────────────────────────────────────────────
  app.get("/api/settings", async (req, res) => {
    const u = uid(req, res); if (!u) return;
    try {
      const { rows } = await pool.query("SELECT * FROM app_settings WHERE user_id = $1", [u]);
      res.json(rows.length ? rows[0] : null);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Reference data (shared — no user_id) ────────────────────────────────
  app.get("/api/tax_brackets", async (req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM tax_brackets WHERE tax_year = $1 AND filing_status = $2 ORDER BY bracket_floor",
        [req.query.year || 2025, req.query.status || "mfj"]
      );
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/irmaa_tiers", async (req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM irmaa_tiers WHERE effective_year = $1 AND filing_status = $2 ORDER BY magi_floor",
        [req.query.year || 2025, req.query.status || "mfj"]
      );
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/rmd_table", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM rmd_table ORDER BY age");
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Snapshots ───────────────────────────────────────────────────────────
  app.get("/api/snapshots", async (req, res) => {
    const u = uid(req, res); if (!u) return;
    try {
      const { rows } = await pool.query(
        "SELECT * FROM monthly_snapshots WHERE user_id = $1 ORDER BY month DESC LIMIT 24", [u]
      );
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // (health check lives in server.cjs — not duplicated here)

  console.log("  ✅ RetireStrong v14 routes loaded (16 new endpoints)");
};
