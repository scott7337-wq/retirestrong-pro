require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// ── PostgreSQL ───────────────────────────────────────────────────────────────
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: process.env.DB_NAME || 'retirestrong_pro',
  user: process.env.USER,
});

// ── Fetch helper ─────────────────────────────────────────────────────────────
let fetchFn;
async function getFetch() {
  if (!fetchFn) {
    if (typeof globalThis.fetch === 'function') {
      fetchFn = globalThis.fetch;
    } else {
      const mod = await import('node-fetch');
      fetchFn = mod.default;
    }
  }
  return fetchFn;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── Auth endpoints (email-only login — REPLACE WITH REAL AUTH BEFORE PUBLIC LAUNCH) ──
app.post('/api/auth/login', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  try {
    const { rows } = await pool.query(
      'SELECT user_id, email, display_name AS name, onboarding_complete, onboarding_data FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (!rows.length) return res.status(404).json({ error: 'No account found for that email' });
    // In real auth: create session/JWT here. For now: just return the user record.
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const { rows } = await pool.query(
      'SELECT user_id, email, display_name AS name, onboarding_complete, onboarding_data FROM users WHERE user_id = $1', [userId]
    );
    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Persist onboarding completion + draft data. Called once when the wizard
// finishes. The draft JSON is hydrated back into `inp` on subsequent loads.
app.post('/api/auth/complete_onboarding', async (req, res) => {
  const { user_id, draft } = req.body || {};
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  try {
    const u = await pool.query('SELECT user_id FROM users WHERE user_id = $1', [user_id]);
    if (!u.rows.length) return res.status(403).json({ error: 'Forbidden' });
    const { rows } = await pool.query(
      `UPDATE users SET onboarding_complete = true, onboarding_data = $2, updated_at = now()
       WHERE user_id = $1
       RETURNING user_id, email, display_name AS name, onboarding_complete, onboarding_data`,
      [user_id, draft || null]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── user_id guard — all /api routes except /auth and /health require a valid user ──
app.use('/api', async (req, res, next) => {
  if (req.path.startsWith('/auth') || req.path === '/health') return next();
  const userId = req.query.user_id || req.body?.user_id;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const { rows } = await pool.query(
      'SELECT user_id FROM users WHERE user_id = $1', [userId]
    );
    if (!rows.length) return res.status(403).json({ error: 'Forbidden' });
    req.userId = userId;
    next();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── AI Proxy ─────────────────────────────────────────────────────────────────
app.post('/v1/messages', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set.' });
  }
  try {
    const fetch = await getFetch();
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        ...req.body,
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
      }),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Proxy failed: ' + err.message });
  }
});

// ── Account name mapper — DB name → app short name ───────────────────────────
function mapAccount(dbName) {
  if (!dbName) return 'IRA';
  const n = dbName.toLowerCase();
  if (n.includes('roth 401') || n.includes('oracle')) return 'Roth 401k';
  if (n.includes('roth'))     return 'Roth IRA';
  if (n.includes('brokerage') || n.includes('taxable')) return 'Taxable';
  if (n.includes('ira'))      return 'IRA';
  return dbName;
}

// ── Holdings — all reads and writes are scoped to req.userId ─────────────────
// req.userId is set and validated by the user_id middleware above.
// Never query holdings without a user_id filter — the accounts table joins are
// the boundary between users; always filter accounts.user_id = req.userId.
app.get('/api/holdings', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT h.id, h.symbol, h.name, h.current_value, h.asset_type,
             h.bucket, h.quantity, h.maturity_date, h.as_of_date,
             a.account_name
      FROM holdings h
      JOIN accounts a ON h.account_id = a.account_id
      WHERE a.user_id = $1
      ORDER BY h.bucket, a.account_name, h.name
    `, [req.userId]);
    const rows = result.rows.map((r, i) => ({
      id: 'db' + r.id,
      name: r.name || r.symbol,
      symbol: r.symbol,
      amount: parseFloat(r.current_value) || 0,
      type: r.asset_type || 'Cash',
      account: mapAccount(r.account_name),
      bucket: r.bucket || null,
      shares: r.quantity ? parseFloat(r.quantity) : null,
      maturity: r.maturity_date ? new Date(r.maturity_date).toLocaleDateString('en-US', {month:'short', year:'numeric'}) : 'Liquid',
      yld: '—',
      risk: 'Low',
      as_of_date: r.as_of_date,
    }));
    res.json(rows);
  } catch (err) {
    console.error('Holdings query error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', version: 'v14' });
  } catch (e) {
    res.json({ status: 'degraded', db: 'disconnected', error: e.message });
  }
});

// ── v14 READ routes (profile, SS, Roth plan, buckets, tax, etc.) ─────────────
const addV14Routes = require('./retirestrong-v14-routes.cjs');
addV14Routes(app, pool);

// ── v14 WRITE routes (Phase 1 — settings/assets/buckets write-back) ──────────
const addV14Writes = require('./retirestrong-v14-writes.cjs');
addV14Writes(app, pool);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = 3101;
app.listen(PORT, async () => {
  console.log(`✅ RetireStrong local proxy running at http://localhost:${PORT}`);
  try {
    const r = await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected:', r.rows[0].now);
  } catch (e) {
    console.error('❌ PostgreSQL connection failed:', e.message);
  }
});
