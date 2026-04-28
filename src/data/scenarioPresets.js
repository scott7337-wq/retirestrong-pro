function clonePlan(p) { return Object.assign({}, p); }

const SCENARIO_PRESETS = [
  {
    id: "base_case",
    label: "Base Case",
    description: "Start with your current plan exactly as it is today.",
    buttonLabel: "Create Base Case Copy",
    defaultName: "Base Case Copy",
    accentColor: "#059669",
    scenarioInsight: "Your plan as-is. Use this as the benchmark when comparing other scenarios.",
    apply(p) { return clonePlan(p); },
  },
  {
    id: "bad_first_five_years",
        label: "Bad First Five Years",
        description: "Test what happens if retirement begins with weak markets.",
        buttonLabel: "Create Stress Scenario",
        defaultName: "Bad First Five Years",
        accentColor: "#ef4444",
        scenarioInsight: "Equity mean drops to ~3%/yr for years 1–5. B1 cash absorbs early draws while B3 recovers — bucket strategy working as designed.",
        apply(p) {
          const n = clonePlan(p);
          // Correct sequence-of-returns model: equity mean drops 15pts in years 1-5 ONLY.
          // Years 6+ revert to normal long-run returns. This lets the bucket strategy work
          // as designed — B1 cash covers expenses while B3 equity has time to recover.
          n.seqStressYears      = 5;
          n.seqStressEquityDrop = 0.04;
          n.seqStressType       = 'market';
          return n;
        },
      },  {
    id: "stagflation",
    label: "Stagflation",
    description: "Higher inflation and weaker real returns for ~8 years, then recovery.",
    buttonLabel: "Create Stagflation Scenario",
    defaultName: "Stagflation Scenario",
    accentColor: "#f59e0b",
    scenarioInsight: "8 years of ~5% inflation and weaker real returns. Expense drag is the primary driver — B3 is not shielded since markets aren't crashing, just slow.",
    apply(p) {
      const n = clonePlan(p);
      // Equity mean drops 3pp for 8 years (stagflation hurts real returns but
      // doesn't crash equities like a bear market — 7% → 4% mean).
      n.seqStressYears          = 8;
      n.seqStressEquityDrop     = 0.03;
      // Inflation elevated +2pp for 8 years (e.g. 3% → 5%), then reverts.
      // Modelled on 1970s US stagflation (~1973–1981, ~8 years).
      n.seqStressInflationYears = 8;
      n.seqStressInflationAdd   = 0.02;
      n.seqStressType           = 'expense';
      // Healthcare inflation stays elevated — separately tracked cost driver.
      n.healthInflation = Math.min(0.15, (n.healthInflation || 0.05) + 0.02);
      return n;
    },
  },
  {
    id: 'recession',
    label: 'Recession',
    description: 'A market downturn lasting 2–3 years forces draws on cash reserves.',
    buttonLabel: 'Create Recession Scenario',
    defaultName: 'Recession',
    accentColor: '#f97316',
    scenarioInsight: "Equity drops ~14%/yr mean for 3 years. B1 gap in year 3 forces B3 draws at depressed prices — the classic sequence-of-returns wound.",
    apply(p) {
      const n = clonePlan(p);
      n.seqStressYears      = 3;
      n.seqStressEquityDrop = 0.14;
      n.seqStressType       = 'market';
      return n;
    },
  },
  {
    id: "healthcare_shock",
    label: "Healthcare Shock",
    description: "Test the effect of higher medical costs later in retirement.",
    buttonLabel: "Create Healthcare Scenario",
    defaultName: "Healthcare Shock",
    accentColor: "#e879f9",
    scenarioInsight: "Phase 1 costs up 25%, Phase 2 up 35%, HC inflation at 6.5%. Success rate reflects the compounding cost of healthcare over a 25-year horizon.",
    apply(p) {
      const n = clonePlan(p);
      n.healthPhase1Annual = Math.round((n.healthPhase1Annual || 27896) * 1.25);
      n.healthPhase2Annual = Math.round((n.healthPhase2Annual || 14873) * 1.35);
      n.healthPhase1EndAge = Math.max(65,(n.healthPhase1EndAge|| 68) - 2);
      n.healthInflation    = Math.min(0.15,(n.healthInflation || 0.05) + 0.015);
      n.seqStressType      = 'expense';
      return n;
    },
  },
  {
    id: "spend_heavy_early_retirement",
    label: "Spend-Heavy Early Retirement",
    description: "Model higher spending in the active, healthy years.",
    buttonLabel: "Create Spending Scenario",
    defaultName: "Spend Heavy Early Retirement",
    accentColor: "#60a5fa",
    scenarioInsight: "Travel +30%, other +15%, food/transport +10%, plus $25K in one-time 2027–28 spend. Go-go years lift quality of life but reduce the long-run portfolio cushion.",
    apply(p) {
      const n = clonePlan(p);
      n.travelMonthly    = Math.round((n.travelMonthly    || 1200) * 1.30);
      n.otherMonthly     = Math.round((n.otherMonthly     || 2800) * 1.15);
      n.foodMonthly      = Math.round((n.foodMonthly      || 1200) * 1.10);
      n.transportMonthly = Math.round((n.transportMonthly || 600)  * 1.10);
      n.monthlyExpenses  = (n.housingMonthly || 2200) + n.foodMonthly + n.transportMonthly + n.travelMonthly + n.otherMonthly;
      n.extraSpend2027   = (n.extraSpend2027 || 0) + 15000;
      n.extraSpend2028   = (n.extraSpend2028 || 0) + 10000;
      n.seqStressType    = 'expense';
      return n;
    },
  },
];

export default SCENARIO_PRESETS;