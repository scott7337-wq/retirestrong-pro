require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// ── PostgreSQL ───────────────────────────────────────────────────────────────
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'retirestrong_pro',
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
      body: JSON.stringify(req.body),
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

// ── Holdings (GET — live ones also live in v14-routes; this is the canonical one) ──
app.get('/api/holdings', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT h.id, h.symbol, h.name, h.current_value, h.asset_type,
             h.bucket, h.quantity, h.maturity_date, h.as_of_date,
             a.account_name
      FROM holdings h
      JOIN accounts a ON h.account_id = a.account_id
      ORDER BY h.bucket, a.account_name, h.name
    `);
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
