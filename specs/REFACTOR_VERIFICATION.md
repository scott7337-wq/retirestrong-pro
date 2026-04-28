# Refactor Verification — RetireStrong Pro

## Purpose

Confidence check that the engine extraction (BRIEF_1) did not change financial outputs.
These are reference outputs produced from the current codebase against DEFAULTS.
Compare against these numbers after any future engine changes.

---

## Reference inputs

All outputs below use `DEFAULTS` from `src/engine/constants.js`:
- birthYear: 1959, currentAge: 66, retirementAge: 67, lifeExpectancy: 90
- ssAge: 70, ssFRA: 3445, spouseSSAt67: 1879, spouseSSAge: 67, hasSpouse: true
- monthlyExpenses: 8000, inflationRate: 3.0, growthReturnRate: 7.0
- CAPE inputs: capeRatio: 28.5, tenYrTreasury: 4.2, tipsYield: 1.8

---

## Social Security

| Function | Input | Expected output |
|---|---|---|
| `ssBenefitFactor(62)` | — | 0.7000 |
| `ssBenefitFactor(67)` | — | 1.0000 |
| `ssBenefitFactor(70)` | — | 1.2400 |
| `ssIncomeForYear(DEFAULTS, 2029)` | SS start year for primary (1959+70) | 17,939 (half-year entry) |
| `ssIncomeForYear(DEFAULTS, 2032)` | 3 years post-start | 79,487 |

Note: 2029 is the first year primary SS starts (birthYear 1959 + claim age 70).
Half-year convention: first-year SS is `monthly × 2` (mid-year start approximation).

---

## Tax

| Function | Input | Expected output |
|---|---|---|
| `effectiveTax(100000, 'married')` | $100K gross, MFJ 2024 brackets | $8,032.00 |
| `marginalRate(150000, 'married')` | $150K income | 0.22 (22%) |
| `capeBased(28.5, 4.2, 1.8)` | Reference CAPE inputs | `{ stock: 0.0551, bond: 0.042, inflation: 0.024 }` |

---

## Cash Flow (selected rows, DEFAULTS)

| Year | Expenses | Primary SS | Spouse SS | Portfolio balance |
|---|---|---|---|---|
| 2029 | 120,297 | 8,544 | 9,395 | 1,485,206 |
| 2032 | 130,612 | 55,206 | 24,282 | 1,589,950 |

2029: first year SS income appears (half-year convention).
2032: both SS streams running at full annual rate with COLA.

---

## Monte Carlo

Monte Carlo uses `Math.random()` and is not deterministically seeded. Exact results
vary each run. Instead, verify these behavioral properties:

**Shape checks (run in browser console against DEFAULTS):**
- `successRate` should be in the range 80–95% for DEFAULTS
- `mcData.length` should equal 500
- `mcData[0].total.length` should equal `DEFAULTS.lifeExpectancy - DEFAULTS.currentAge + 1` (= 25)
- No simulation should produce a negative final balance (values are clamped to 0)

**Console verification:**
```js
// Paste in browser console while app is loaded:
window.verifyRoundTrip()   // checks inp → buildPlan → flattenPlan round-trip
```

---

## How to re-run these checks

```bash
node -e "
const { ssBenefitFactor, ssIncomeForYear } = require('./src/engine/social-security.js');
const { DEFAULTS } = require('./src/engine/constants.js');
const { capeBased, effectiveTax, marginalRate } = require('./src/engine/tax.js');
const { buildCashFlow } = require('./src/engine/cashflow.js');

var inp = Object.assign({}, DEFAULTS);
var er = capeBased(28.5, 4.2, 1.8);
console.log('SS 70:', ssBenefitFactor(70));
console.log('Tax 100k:', effectiveTax(100000, 'married').toFixed(2));
console.log('er inflation:', er.inflation.toFixed(4));
var cf = buildCashFlow(inp, er);
var r = cf.find(function(r) { return r.year === 2029; });
if (r) console.log('cf 2029 expenses:', r.expenses, 'scottSS:', r.scottSS);
"
```

Expected: SS 70 = 1.24, Tax 100k = 8032.00, er inflation = 0.0240, cf 2029 expenses ≈ 120,297.

---

## What this does NOT cover

- Roth conversion logic (rothConvForYear) — verify manually via the Roth tab
- RMD calculations — verify against IRS Publication 590-B life expectancy tables
- State tax calculations — covered by `totalTaxWithState` but not sampled here
- Full cashflow balance trajectory — trust useMemo recompute; test via browser verifyRoundTrip()
