// Compare-view interactivity
(function() {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => el.querySelectorAll(s);

  // ---- Generate procedural bars for tax + income views ----
  // Federal tax by year — Retire-65 vs Retire-67
  // (illustrative shape: A has steady mid taxes + RMD spike at 73, B has higher 67-72 then lower post-73)
  const taxA = [10, 9, 9, 11, 12, 14, 16, 38, 42, 44, 46, 48, 50, 52, 54, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56];
  const taxB = [10, 9, 9, 28, 30, 32, 34, 36, 32, 30, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 56, 56, 56, 56, 56, 56, 56];

  function renderBars(group, data, color) {
    const max = Math.max(...data);
    const w = 400 / data.length;
    const gap = w * 0.18;
    const bw = w - gap;
    const ns = 'http://www.w3.org/2000/svg';
    data.forEach((v, i) => {
      const h = (v / max) * 110;
      const x = i * w + gap / 2;
      const y = 130 - h;
      const r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', x);
      r.setAttribute('y', y);
      r.setAttribute('width', bw);
      r.setAttribute('height', h);
      r.setAttribute('rx', 1);
      group.appendChild(r);
    });
  }

  const barsA = $('.bars-a');
  const barsB = $('.bars-b');
  if (barsA) renderBars(barsA, taxA);
  if (barsB) renderBars(barsB, taxB);

  // Stacked bars for income view
  // Each year has 4 stacked components: taxable, td/conv, roth, ss
  // 31 years (65-95)
  function buildStack(scenario) {
    // returns array of [taxable, tdConv, roth, ss] per year — totals roughly equal
    const arr = [];
    if (scenario === 'A') {
      // Retire-65: SS at 67 (year 2), big TD draws early
      for (let i = 0; i < 31; i++) {
        const age = 65 + i;
        let taxable = 0, td = 0, roth = 0, ss = 0;
        if (age < 67) { taxable = 60; td = 48; }                // pre-SS
        else if (age < 73) { taxable = 30; td = 32; ss = 46; }   // SS active, pre-RMD
        else { td = 56; ss = 50; roth = 6; }                     // RMD years
        arr.push([taxable, td, roth, ss]);
      }
    } else {
      // Retire-67: still working 65-66 (salary as "taxable"), SS at 70
      for (let i = 0; i < 31; i++) {
        const age = 65 + i;
        let taxable = 0, td = 0, roth = 0, ss = 0;
        if (age < 67) { taxable = 100; }                          // salary
        else if (age < 70) { taxable = 30; td = 56; }             // pre-SS retirement
        else if (age < 73) { taxable = 22; td = 36; ss = 56; }    // SS at 70
        else { td = 44; ss = 60; roth = 8; }                      // smaller RMDs
        arr.push([taxable, td, roth, ss]);
      }
    }
    return arr;
  }
  const colors = ['#01696F', '#4A8B91', '#A6CDD0', '#B8651A'];

  function renderStack(group, data) {
    const ns = 'http://www.w3.org/2000/svg';
    const w = 400 / data.length;
    const gap = w * 0.15;
    const bw = w - gap;
    let max = 0;
    data.forEach(d => { const sum = d.reduce((a, b) => a + b, 0); if (sum > max) max = sum; });

    data.forEach((parts, i) => {
      let yCursor = 130;
      const x = i * w + gap / 2;
      parts.forEach((v, j) => {
        if (v <= 0) return;
        const h = (v / max) * 110;
        const r = document.createElementNS(ns, 'rect');
        r.setAttribute('x', x);
        r.setAttribute('y', yCursor - h);
        r.setAttribute('width', bw);
        r.setAttribute('height', h);
        r.setAttribute('fill', colors[j]);
        r.setAttribute('opacity', '0.9');
        group.appendChild(r);
        yCursor -= h;
      });
    });
  }
  const stackA = $('.bars-stack-a');
  const stackB = $('.bars-stack-b');
  if (stackA) renderStack(stackA, buildStack('A'));
  if (stackB) renderStack(stackB, buildStack('B'));

  // ---- Dimension switcher ----
  const verdicts = {
    plan:   "<strong>Retire-67 has $430k more by age 95</strong> — driven by 2 extra working years and a larger SS check from 70.",
    taxes:  "<strong>Retire-67 wins on lifetime tax efficiency by ~$52k</strong> — but the win is concentrated post-73, and you take the pain in years 67-72.",
    mc:     "<strong>Retire-67 lifts confidence from 91% → 96%</strong> — and the 10th-percentile worst case improves from $0 to $210k. Tail risk is meaningfully lower.",
    income: "<strong>Retire-67 costs you ~$54k/yr in years 1-2</strong> — that's the salary continuation tradeoff. The payback comes after 70 with a bigger SS check."
  };
  const verdictTextEl = $('#verdictText');
  function setDim(dim) {
    $$('.dim-tab').forEach(t => t.classList.toggle('active', t.dataset.dim === dim));
    $$('.dim-view').forEach(v => v.hidden = (v.id !== `dim-${dim}`));
    if (verdictTextEl && verdicts[dim]) {
      verdictTextEl.innerHTML = verdicts[dim];
    }
    // collapse the verdict detail when switching
    $('#verdictDetail').hidden = true;
  }

  $$('.dim-tab').forEach(tab => {
    tab.addEventListener('click', () => setDim(tab.dataset.dim));
  });

  // verdict expander
  $('#verdictExpand').addEventListener('click', () => {
    const detail = $('#verdictDetail');
    detail.hidden = !detail.hidden;
    $('#verdictExpand').textContent = detail.hidden ? 'Why ↓' : 'Why ↑';
  });

  // dismiss pinned obs
  $$('.pin-dismiss').forEach(b => b.addEventListener('click', e => e.target.closest('.pinned-obs').remove()));

  // ---- Chat ----
  const composer = $('#composer');
  const sendBtn = $('#sendBtn');
  const chatLog = $('#chatLog');

  composer.addEventListener('input', () => {
    composer.style.height = 'auto';
    composer.style.height = Math.min(composer.scrollHeight, 120) + 'px';
  });
  composer.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  sendBtn.addEventListener('click', send);

  function send() {
    const text = composer.value.trim();
    if (!text) return;
    appendUserMessage(text);
    composer.value = '';
    composer.style.height = 'auto';
    setTimeout(() => respond(text), 600);
  }

  // chip click — submit
  document.addEventListener('click', e => {
    if (e.target.classList.contains('chip')) {
      composer.value = e.target.textContent.trim();
      send();
    }
  });

  function respond(text) {
    const lower = text.toLowerCase();

    // Switch view based on intent
    if (/\b(monte carlo|confidence|success rate|worst.*path|sequence risk)\b/.test(lower)) {
      setDim('mc');
      appendAi(
        `<p>Switched to <strong>Monte Carlo</strong>. Headline: <strong>91% → 96%</strong> success, and the 10th-percentile outcome improves from $0 to $210k. Most of the gain comes from delaying SS — the bigger check at 70 is a powerful longevity hedge.</p>
        <p>The widest band gap is around ages 80-90. Retire-65's worst trials run out of money there; Retire-67's don't.</p>`,
        `run_monte_carlo(scenarios: ["retire-65", "retire-67"], trials: 1000)`,
        ['Show me a specific worst-case path', 'What if I add Guyton-Klinger guardrails?', 'Is 96% enough confidence?']
      );
      return;
    }
    if (/\b(tax|irmaa|bracket|rmd|conversion)\b/.test(lower)) {
      setDim('taxes');
      appendAi(
        `<p>Switched to <strong>Taxes</strong>. The shape of the difference matters more than the total. Retire-67 pays <strong>+$78k</strong> more before 73 (during conversions), then <strong>−$26k</strong> after 73 (smaller RMDs). Net +$52k, but the late-life savings are at the highest brackets.</p>
        <p>The pinned moment at age 73 is where this strategy starts paying you back.</p>`,
        `compare_scenarios(a, b, lens: "taxes")`,
        ['Show effective tax rate by year', 'Cap conversions at IRMAA Tier 1', 'What if tax rates rise after 2026?']
      );
      return;
    }
    if (/\b(income|cash flow|cash|withdraw|spending|first.*year)\b/.test(lower)) {
      setDim('income');
      appendAi(
        `<p>Switched to <strong>Income</strong>. Years 1-2 of Retire-65 draw $108k/yr from portfolio + SS, while Retire-67 has $162k of salary still coming in. After age 70, Retire-67's income climbs higher because of the larger SS check.</p>
        <p>The interesting question: how much do you value <em>discretionary cash</em> in your mid-60s? Travel years, healthcare, helping kids — these don't recur.</p>`,
        `compare_scenarios(a, b, lens: "income")`,
        ['Show me how I cover early years', 'What if I spend more in years 1-5?', 'Add a part-time consulting income']
      );
      return;
    }
    if (/\b(plan|balance|portfolio|net worth|end)\b/.test(lower)) {
      setDim('plan');
      appendAi(
        `<p>Switched to <strong>Plan</strong>. Retire-67 ends $430k higher at 95 in real dollars. Both peak around age 73-75 — that's the natural inflection where withdrawals overtake growth.</p>`,
        `compare_scenarios(a, b, lens: "plan")`,
        ['Why do they peak at different ages?', 'What if returns are 1pp lower?', 'Add a 2008-style crash at 70']
      );
      return;
    }
    if (lower.includes('cap') && lower.includes('irmaa')) {
      appendAi(
        `<p>Modeled it. Capping Retire-67's conversions at the IRMAA Tier 1 ceiling reduces conversions by ~$22k/yr but keeps you under Tier 2 in 4 of 6 years. The lifetime-tax win shrinks from <strong>$52k → $34k</strong>, but you avoid <strong>~$4,200</strong> in cumulative IRMAA surcharges.</p>
        <p>Want me to add this as a third scenario for full comparison?</p>`,
        `propose_change(scenario: "retire-67", constraint: "irmaa_tier_1") · run_projection(...)`,
        ['Yes — add as Retire-67-IRMAA', 'Show me the year-by-year diff', 'Stick with the original Retire-67']
      );
      return;
    }
    if (lower.includes('add') && lower.includes('scenario')) {
      appendAi(
        `<p>What's the third scenario? You can describe it (e.g. "Retire at 67 but claim SS at 67") or pick from saved scenarios.</p>`,
        null,
        ['Retire-67 + SS at 67', 'Retire-66 split the difference', 'Move to AZ (no income tax)']
      );
      return;
    }
    // default
    appendAi(
      `<p>Tell me which lens you want to look through — plan, Monte Carlo, taxes, or income — and I'll switch the view and walk through it.</p>`,
      null,
      ['Show plan', 'Show Monte Carlo', 'Show taxes', 'Show income']
    );
  }

  function appendUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'msg user';
    div.innerHTML = `<div class="bubble"><p>${escape(text)}</p></div>`;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }
  function appendAi(html, tool, suggestions) {
    const div = document.createElement('div');
    div.className = 'msg ai';
    let toolHtml = tool ? `<div class="tool-call"><span class="tool-tag">tool</span><code>${escape(tool)}</code><button class="tool-expand">show</button></div>` : '';
    let chips = suggestions && suggestions.length
      ? `<div class="suggestions">${suggestions.map(s => `<button class="chip">${escape(s)}</button>`).join('')}</div>`
      : '';
    div.innerHTML = `<div class="avatar">RS</div>
      <div class="bubble">
        ${html}
        ${toolHtml}
        ${chips}
        <div class="disclaimer">This is education, not investment advice.</div>
      </div>`;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }
  function escape(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Initialize on Taxes (matches the seeded chat conversation)
  setDim('taxes');

})();
