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

// ── AI Chat endpoint with tool calling ───────────────────────────────────────
// Auth: the global /api middleware (above) attaches req.userId.
// This route requires the client to pass user_id in the body so the middleware
// can validate it. There is no separate requireAuth — the path-prefix middleware
// already enforces that req.userId exists and is a real user.
app.post('/api/chat', async (req, res) => {
  const { messages = [], sessionId, activeTab = 'overview' } = req.body || {};
  const userId = req.userId;

  try {
    // ── Load plan state for this user ──────────────────────────────────────
    const planResult = await pool.query(`
      SELECT
        p.user_id,
        EXTRACT(YEAR FROM age(p.person1_dob))::int                                     AS current_age,
        EXTRACT(YEAR FROM p.person1_dob)::int                                          AS birth_year,
        CASE
          WHEN p.retirement_date IS NOT NULL
          THEN EXTRACT(YEAR FROM age(p.retirement_date, p.person1_dob))::int
          ELSE NULL
        END                                                                            AS retirement_age,
        p.monthly_spending                                                             AS monthly_expenses,
        p.general_inflation                                                            AS inflation_rate,
        p.life_expectancy                                                              AS life_expectancy,
        p.filing_status                                                                AS filing_status,
        p.survivor_mode                                                                AS survivor_mode,
        (p.person2_dob IS NOT NULL)                                                    AS has_spouse,
        CASE
          WHEN p.person2_dob IS NOT NULL
          THEN EXTRACT(YEAR FROM age(p.person2_dob))::int
          ELSE NULL
        END                                                                            AS spouse_current_age,
        (SELECT fra_pia_monthly FROM social_security
            WHERE user_id = p.user_id AND person = 1 LIMIT 1)                          AS ss_monthly,
        (SELECT claiming_age    FROM social_security
            WHERE user_id = p.user_id AND person = 1 LIMIT 1)                          AS ss_age,
        (SELECT fra_pia_monthly FROM social_security
            WHERE user_id = p.user_id AND person = 2 LIMIT 1)                          AS spouse_ss_monthly,
        (SELECT claiming_age    FROM social_security
            WHERE user_id = p.user_id AND person = 2 LIMIT 1)                          AS spouse_ss_age,
        (SELECT COALESCE(SUM(h.current_value), 0)::numeric
            FROM holdings h
            JOIN accounts a ON a.account_id = h.account_id
            WHERE a.user_id = p.user_id)                                               AS total_portfolio
      FROM profiles p
      WHERE p.user_id = $1
      LIMIT 1
    `, [userId]);
    const plan = planResult.rows[0] || {};

    // ── Get or create chat session ─────────────────────────────────────────
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const sessResult = await pool.query(
        `INSERT INTO chat_sessions (user_id, active_scenario_id)
         VALUES ($1, NULL) RETURNING session_id`,
        [userId]
      );
      currentSessionId = sessResult.rows[0].session_id;
    }

    // ── Check token budget ─────────────────────────────────────────────────
    const budgetResult = await pool.query(
      `SELECT COALESCE(SUM((tool_calls->>'tokens_used')::int), 0) AS tokens_used
         FROM conversation_turns
        WHERE session_id = $1
          AND tool_calls ? 'tokens_used'`,
      [currentSessionId]
    );
    const sessionTokensUsed = parseInt(budgetResult.rows[0]?.tokens_used || 0);
    const TOKEN_BUDGET = 30000;
    if (sessionTokensUsed > TOKEN_BUDGET) {
      return res.json({
        reply: "We've covered a lot of ground this session. Start a new conversation to keep the context sharp.",
        chips: [],
        toolCallsMade: [],
        sessionId: currentSessionId,
        tokensUsed: sessionTokensUsed,
        budgetExceeded: true,
      });
    }

    // ── Build system prompt ────────────────────────────────────────────────
    const planSummary = `
User's retirement plan:
- Current age: ${plan.current_age || 'unknown'}
- Retirement age: ${plan.retirement_age || 'unknown'}
- Monthly expenses: $${plan.monthly_expenses || 'unknown'}
- Total portfolio: $${plan.total_portfolio || 'unknown'} (approx)
- SS claim age: ${plan.ss_age || 'unknown'}
- Filing status: ${plan.filing_status || 'married'}
- Has spouse: ${plan.has_spouse ? 'yes' : 'no'}
- Currently viewing: ${activeTab} tab
`.trim();

    const systemPrompt = `You are RetireStrong's AI coach — a knowledgeable retirement planning partner with full context of this user's plan.

${planSummary}

Rules:
- Be concise. 3-5 sentences max per response in rail mode.
- Never do math yourself. Always call a tool to get numbers.
- Every response that contains a number must cite the tool that produced it.
- End every coaching response with exactly: "This is education, not investment advice."
- Stay in scope: tax, SS timing, Roth conversions, withdrawal sequencing, spending. Decline anything else politely.
- If the user asks something you can't answer from their plan, say so directly.
- Suggest 2-3 follow-up chips at the end of responses where the conversation has obvious next moves.
- Format chips as: [CHIPS: chip1 | chip2 | chip3] at the very end of your response.`;

    // ── Tool definitions ───────────────────────────────────────────────────
    const tools = [
      {
        name: "read_plan",
        description: "Returns the user's current plan state — accounts, balances, SS inputs, spending, tax assumptions. Call this first before any calculation.",
        input_schema: {
          type: "object",
          properties: {
            fields: {
              type: "array",
              items: { type: "string" },
              description: "Optional: specific fields to return. Omit for full plan.",
            },
          },
        },
      },
      {
        name: "run_projection",
        description: "Runs the deterministic year-by-year cash flow projection. Returns key metrics: success rate, peak balance, balance at 90, annual gaps. Use when the user asks about their plan's health, retirement age changes, or spending changes.",
        input_schema: {
          type: "object",
          properties: {
            leverOverlays: {
              type: "array",
              description: "Optional lever overlays to apply. E.g. [{type:'workLonger', additionalYears:2}]",
              items: { type: "object" },
            },
            spendingPolicy: {
              type: "object",
              description: "Optional spending policy override. E.g. {type:'smile'}",
            },
          },
        },
      },
      {
        name: "query_irmaa_headroom",
        description: "Returns this year's headroom to the next IRMAA tier and the next tax bracket. Use when the user asks about Roth conversions, IRMAA, or tax bracket room.",
        input_schema: { type: "object", properties: {} },
      },
      {
        name: "explain_mechanism",
        description: "Returns a plain-English explanation of a retirement planning concept (IRMAA, RMDs, Roth conversion ladder, guardrails, sequence risk, etc). Use when the user asks 'what is' or 'how does' or 'why does'.",
        input_schema: {
          type: "object",
          properties: {
            concept: {
              type: "string",
              description: "The concept to explain. E.g. 'IRMAA', 'guardrails spending', 'sequence of returns risk'",
            },
          },
          required: ["concept"],
        },
      },
    ];

    // ── Call Claude ────────────────────────────────────────────────────────
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set.' });
    const fetch = await getFetch();

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        tools,
        messages,
      }),
    });

    const claudeData = await claudeResponse.json();
    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeData.error?.message || 'unknown'}`);
    }

    // ── Handle tool calls ──────────────────────────────────────────────────
    const toolCallsMade = [];
    let finalReply = '';
    let totalTokens = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);

    const toolUseBlocks = (claudeData.content || []).filter((b) => b.type === 'tool_use');
    const textBlocks    = (claudeData.content || []).filter((b) => b.type === 'text');

    if (toolUseBlocks.length > 0) {
      const toolResults = [];
      for (const toolUse of toolUseBlocks) {
        const result = await executeToolCall(toolUse.name, toolUse.input, plan, userId, pool);
        toolCallsMade.push({ name: toolUse.name, input: toolUse.input, result });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      const followUpMessages = [
        ...messages,
        { role: 'assistant', content: claudeData.content },
        { role: 'user',      content: toolResults },
      ];

      const followUp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          tools,
          messages: followUpMessages,
        }),
      });

      const followUpData = await followUp.json();
      totalTokens += (followUpData.usage?.input_tokens || 0) + (followUpData.usage?.output_tokens || 0);
      finalReply = (followUpData.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    } else {
      finalReply = textBlocks.map((b) => b.text).join('');
    }

    // ── Parse chips from reply ─────────────────────────────────────────────
    let chips = [];
    const chipsMatch = finalReply.match(/\[CHIPS:\s*([^\]]+)\]/);
    if (chipsMatch) {
      chips = chipsMatch[1].split('|').map((s) => s.trim()).filter(Boolean);
      finalReply = finalReply.replace(/\[CHIPS:[^\]]+\]/, '').trim();
    }

    // ── Save turn(s) to DB ─────────────────────────────────────────────────
    await pool.query(
      `INSERT INTO conversation_turns
         (user_id, session_id, sequence_number, message_role, content)
       VALUES ($1, $2,
         (SELECT COALESCE(MAX(sequence_number), 0) + 1 FROM conversation_turns WHERE session_id = $2),
         'user', $3)`,
      [userId, currentSessionId, messages[messages.length - 1]?.content || '']
    );

    await pool.query(
      `INSERT INTO conversation_turns
         (user_id, session_id, sequence_number, message_role, content, tool_calls)
       VALUES ($1, $2,
         (SELECT COALESCE(MAX(sequence_number), 0) + 1 FROM conversation_turns WHERE session_id = $2),
         'assistant', $3, $4)`,
      [userId, currentSessionId, finalReply,
       JSON.stringify({ toolCallsMade, tokens_used: totalTokens })]
    );

    await pool.query(
      `UPDATE chat_sessions SET turn_count = turn_count + 1 WHERE session_id = $1`,
      [currentSessionId]
    );

    res.json({
      reply: finalReply,
      chips,
      toolCallsMade,
      sessionId: currentSessionId,
      tokensUsed: totalTokens,
    });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Tool execution ───────────────────────────────────────────────────────────
async function executeToolCall(toolName, input, plan, userId, pool) {
  switch (toolName) {
    case 'read_plan': {
      return {
        currentAge:      plan.current_age,
        retirementAge:   plan.retirement_age,
        monthlyExpenses: plan.monthly_expenses,
        ssAge:           plan.ss_age,
        spouseSSAge:     plan.spouse_ss_age,
        filingStatus:    plan.filing_status || 'married',
        hasSpouse:       plan.has_spouse,
        inflationRate:   plan.inflation_rate || 3.0,
        lifeExpectancy:  plan.life_expectancy || 90,
        totalPortfolio:  plan.total_portfolio,
      };
    }

    case 'run_projection': {
      // Simplified projection — full engine wiring in next brief.
      const monthlyExp        = parseFloat(plan.monthly_expenses) || 8000;
      const currentAge        = parseInt(plan.current_age) || 66;
      const lifeExp           = parseInt(plan.life_expectancy) || 90;
      const yearsInRetirement = lifeExp - currentAge;
      const annualExp         = monthlyExp * 12;
      const totalNeeded       = annualExp * yearsInRetirement * 1.03;
      return {
        note: "Simplified projection — full engine wiring in next brief",
        yearsInRetirement,
        estimatedAnnualExpenses: Math.round(annualExp),
        roughTotalNeeded:        Math.round(totalNeeded),
        leverOverlaysApplied:    input.leverOverlays || [],
        spendingPolicy:          input.spendingPolicy || { type: 'flatReal' },
      };
    }

    case 'query_irmaa_headroom': {
      const irmaaResult = await pool.query(
        `SELECT magi_floor, magi_ceiling, monthly_surcharge
           FROM irmaa_tiers
          WHERE filing_status = 'married'
          ORDER BY magi_floor ASC
          LIMIT 3`
      );
      return {
        irmaaTiers: irmaaResult.rows,
        note: "Current year IRMAA tiers. Use read_plan to get user MAGI for headroom calc.",
      };
    }

    case 'explain_mechanism': {
      const explanations = {
        'irmaa': 'IRMAA (Income-Related Monthly Adjustment Amount) is a Medicare premium surcharge triggered when your MAGI from 2 years ago exceeds certain thresholds. For MFJ in 2026, the first tier starts at $212,000 MAGI and adds ~$594/year per person to Part B premiums.',
        'rmd':   'Required Minimum Distributions are mandatory annual withdrawals from tax-deferred accounts starting at age 73 (SECURE Act 2.0). The amount is your IRA balance divided by an IRS life expectancy factor. Failing to take RMDs triggers a 25% penalty.',
        'sequence of returns risk': 'Sequence risk is the danger of experiencing poor investment returns early in retirement. Even if average returns are fine over 30 years, a bad first decade forces you to sell assets at low prices to fund expenses, permanently impairing the portfolio.',
        'roth conversion': 'A Roth conversion moves money from a traditional IRA to a Roth IRA. You pay income tax now, but future growth and withdrawals are tax-free. The strategy works best when current rates are lower than expected future rates — especially before RMDs begin and before Social Security starts.',
        'guardrails': 'The Guyton-Klinger guardrails strategy adjusts spending based on portfolio performance. If your withdrawal rate rises above an upper guardrail (portfolio down), you cut spending by ~10%. If it falls below a lower guardrail (portfolio up), you can increase spending. This trades spending certainty for longevity.',
        'default': `${input.concept} is a retirement planning concept. For a detailed explanation, the user should consult a fee-only financial advisor or resources like the Bogleheads wiki.`,
      };
      const key = Object.keys(explanations).find((k) =>
        input.concept?.toLowerCase().includes(k)
      ) || 'default';
      return { concept: input.concept, explanation: explanations[key] };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

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
