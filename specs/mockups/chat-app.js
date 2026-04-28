// Lightweight mockup interactivity — no real backend
(function() {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ---- mode toggle ----
  $$('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.mode-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const mode = btn.dataset.mode;
      // visual hint: in commit mode, narrow chat pane
      if (mode === 'commit') {
        document.querySelector('.layout').style.gridTemplateColumns = '32% 68%';
      } else {
        document.querySelector('.layout').style.gridTemplateColumns = '42% 58%';
      }
    });
  });

  // ---- working scenario state ----
  let workingActive = true;     // start with working scenario visible (matches mockup chat history)
  let workingPinned = false;

  const diffStrip = $('#diffStrip');
  const workingTab = $('#workingTab');
  const workingPath = $('#workingPath');
  const workingLegend = $('.working-legend');
  const activeScenario = $('#activeScenario');

  function showWorking() {
    workingActive = true;
    diffStrip.hidden = false;
    workingTab.hidden = false;
    workingPath.hidden = false;
    workingLegend.hidden = false;
  }
  function hideWorking() {
    workingActive = false;
    diffStrip.hidden = true;
    workingTab.hidden = true;
    workingPath.hidden = true;
    workingLegend.hidden = true;
    activeScenario.textContent = 'Base plan';
    $$('.scenario-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.scenario-tab[data-scenario="base"]').classList.add('active');
  }

  // mockup boots in 'working visible' state
  showWorking();

  // ---- scenario tab clicks ----
  $$('.scenario-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.classList.contains('add')) return;
      $$('.scenario-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const scenario = tab.dataset.scenario;
      if (scenario === 'working') {
        activeScenario.textContent = 'Retire-67 (working)';
      } else if (scenario === 'base') {
        activeScenario.textContent = 'Base plan';
      } else if (scenario === 'delay-ss') {
        activeScenario.textContent = 'Delay-SS-to-70';
      }
    });
  });

  // ---- discard working scenario ----
  $('#discardBtn').addEventListener('click', () => {
    if (confirm('Discard the working scenario? Chat history is preserved.')) {
      hideWorking();
    }
  });

  // ---- pin flow ----
  const pinModal = $('#pinModal');
  const openPin = () => { pinModal.hidden = false; };
  const closePin = () => { pinModal.hidden = true; };

  $('#pinBtn').addEventListener('click', openPin);
  if ($('#pinChip')) $('#pinChip').addEventListener('click', openPin);
  $('#cancelPin').addEventListener('click', closePin);

  $('#confirmPin').addEventListener('click', () => {
    const name = $('#pinName').value || 'Untitled scenario';
    closePin();

    // Promote working tab → named tab
    workingTab.hidden = true;
    diffStrip.hidden = true;

    // Create a new named tab (insert before "+ New")
    const tabs = document.querySelector('.scenario-tabs');
    const addBtn = document.querySelector('.scenario-tab.add');
    const newTab = document.createElement('button');
    newTab.className = 'scenario-tab named active';
    newTab.dataset.scenario = name.toLowerCase().replace(/\s+/g, '-');
    newTab.textContent = name;
    newTab.addEventListener('click', () => {
      $$('.scenario-tab').forEach(t => t.classList.remove('active'));
      newTab.classList.add('active');
      activeScenario.textContent = name;
    });
    tabs.insertBefore(newTab, addBtn);

    $$('.scenario-tab').forEach(t => t.classList.remove('active'));
    newTab.classList.add('active');
    activeScenario.textContent = name;

    // Add a chat confirmation message
    appendAiMessage(`Pinned. <strong>${escapeHtml(name)}</strong> is now compared alongside your base plan. I'll keep working with the base plan unless you tell me otherwise.`);
  });

  // ---- chat composer ----
  const composer = $('#composer');
  const sendBtn = $('#sendBtn');
  const chatLog = $('#chatLog');

  composer.addEventListener('input', () => {
    composer.style.height = 'auto';
    composer.style.height = Math.min(composer.scrollHeight, 120) + 'px';
  });
  composer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  sendBtn.addEventListener('click', send);

  function send() {
    const text = composer.value.trim();
    if (!text) return;
    appendUserMessage(text);
    composer.value = '';
    composer.style.height = 'auto';
    // canned response after a beat
    setTimeout(() => {
      const resp = cannedResponse(text);
      appendAiMessage(resp.html, resp.tool, resp.suggestions);
    }, 600);
  }

  // ---- chip clicks ----
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) {
      const text = e.target.textContent.trim();
      if (e.target.id === 'pinChip') return; // handled above
      composer.value = text;
      send();
    }
  });

  // ---- canned responses (mockup only) ----
  function cannedResponse(text) {
    const lower = text.toLowerCase();
    if (lower.includes('roth') && (lower.includes('this year') || lower.includes('convert'))) {
      return {
        html: `<p>Looking at your YTD numbers — you've converted $28k against a $40k plan target. You have <strong>$11,400</strong> of room left in the 22% bracket and <strong>$8,200</strong> before the next IRMAA tier. The IRMAA constraint binds first.</p>
        <p>In your situation, leaning toward converting another <strong>~$8,200</strong> this year keeps you in the same Medicare premium tier. Going to the full $11,400 (max bracket) would add about <strong>$1,070</strong> to next year's Part B premiums — only worth it if you expect higher brackets later.</p>`,
        tool: `query_irmaa_headroom() · run_projection(scenario: "convert-8200")`,
        suggestions: ['Convert $8,200 — show diff', 'Convert $11,400 — show diff', 'Why does IRMAA matter?']
      };
    }
    if (lower.includes('2000') || lower.includes('stress') || lower.includes('crash')) {
      return {
        html: `<p>I ran your current plan against the actual <strong>2000–2024 sequence</strong>. The portfolio drops 38% in real terms by 2002, then recovers. Your plan stays viable but with a tight stretch from year 3 to year 8 — lowest balance hits 4.2× annual spending.</p>
        <p>Two levers help: temporarily reduce discretionary spending in those years (Guyton-Klinger style), or delay Roth conversions until the recovery. Want to see what a guardrail rule looks like?</p>`,
        tool: `run_monte_carlo(sequence: "2000-2024", real: true)`,
        suggestions: ['Apply Guyton-Klinger guardrails', 'Try 1973 sequence instead', 'Show worst-case year detail']
      };
    }
    if (lower.includes('annuity') || lower.includes('annuities')) {
      return {
        html: `<p>You ruled out annuities last fall — said you didn't like the loss of liquidity for your kids. Want me to revisit that, or stay with the assumption that annuities are off the table?</p>`,
        tool: `recall_prior_decisions(topic: "annuities")`,
        suggestions: ['Revisit — show me a SPIA option', 'Keep them off the table']
      };
    }
    if (lower.includes('social security') || lower.includes(' ss ') || lower.startsWith('ss')) {
      return {
        html: `<p>In your situation, leaning toward delay (claim at 70) makes sense — you have enough taxable + tax-deferred to bridge the gap to 70 without touching Roth, and your spouse's longevity assumption (92) means the survivor benefit boost is worth more than the foregone payments.</p>
        <p>The argument <em>against</em>: cash flow flexibility in your 60s for travel or healthcare. Want me to model claim ages 67 and 70 side-by-side?</p>`,
        tool: `run_projection(claim_age: 70) · run_projection(claim_age: 67)`,
        suggestions: ['Compare 67 vs 70', 'What if my spouse claims earlier?', 'Pin "Delay-SS-to-70"']
      };
    }
    if (lower.includes('withdraw') || lower.includes('order') || lower.includes('sequence')) {
      return {
        html: `<p>Your current order in the early-retirement phase is <strong>Taxable → Tax-deferred (with conversions) → Roth → HSA</strong>. That's giving you ~$3.1k in LTCG this year (under the 0% threshold for MFJ) and steady Roth conversions of $28k YTD.</p>
        <p>An alternative — pro-rata across taxable and tax-deferred — would smooth your taxable income but reduce conversion runway. Worth a comparison?</p>`,
        tool: `compare_scenarios(base, scenario: "pro-rata-draws")`,
        suggestions: ['Show pro-rata comparison', 'Why the current order works', 'Try Roth-first instead']
      };
    }
    // default
    return {
      html: `<p>Let me check that against your plan. Could you tell me a bit more about what you're trying to figure out — minimize taxes, maximize estate value, or something else?</p>`,
      tool: null,
      suggestions: ['Minimize lifetime taxes', 'Maximize estate value', 'Stay under IRMAA tier 1']
    };
  }

  function appendUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'msg user';
    div.innerHTML = `<div class="bubble"><p>${escapeHtml(text)}</p></div>`;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function appendAiMessage(html, tool, suggestions) {
    const div = document.createElement('div');
    div.className = 'msg ai';
    let toolHtml = '';
    if (tool) {
      toolHtml = `<div class="tool-call"><span class="tool-tag">tool</span><code>${escapeHtml(tool)}</code><button class="tool-expand">show</button></div>`;
    }
    let chipsHtml = '';
    if (suggestions && suggestions.length) {
      chipsHtml = `<div class="suggestions">${suggestions.map(s => `<button class="chip">${escapeHtml(s)}</button>`).join('')}</div>`;
    }
    div.innerHTML = `<div class="avatar">RS</div>
      <div class="bubble">
        ${html}
        ${toolHtml}
        ${chipsHtml}
        <div class="disclaimer">This is education, not investment advice.</div>
      </div>`;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
})();
