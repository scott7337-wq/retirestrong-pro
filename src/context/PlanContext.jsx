import { createContext, useContext, useState, useCallback } from 'react';
import { buildCashFlow } from '../engine/cashflow.js';
import { runMonteCarlo } from '../engine/montecarlo.js';

const PlanContext = createContext(null);

/**
 * PlanContext — Architecture notes
 *
 * SOURCE OF TRUTH (App.jsx owns these):
 *   inp         — flat plan inputs object (all numeric assumptions)
 *   assets      — array of holdings (account, type, bucket, amount)
 *   bucketCfg   — bucket target configuration
 *   raw         — string versions of inp fields (for controlled inputs)
 *
 * DERIVED STATE (recomputed via useMemo in App.jsx, never stored):
 *   derivedTotals   — {taxable, iraCash, iraTips, iraDividend, iraGrowth, roth}
 *   inpWithAssets   — Object.assign(inp, derivedTotals balance fields)
 *   er              — capeBased() expected-return object
 *   cashFlow        — buildCashFlow(inpWithAssets, er)
 *   mcData          — runMonteCarlo(inpWithAssets, er, derivedTotals)
 *   successRate     — derived from mcData
 *
 * RECOMPUTE TIMING:
 *   All engine outputs (cashFlow, mcData) are React useMemo values keyed on
 *   inpWithAssets and er. They recompute automatically when inp or assets change.
 *   There is no manual recompute() call needed or used in normal operation.
 *
 * PARTIAL-LOAD SAFETY:
 *   On initial mount: inp = flattenPlan({}) (all DEFAULTS), assets = DEFAULT_ASSETS.
 *   useMemo fires immediately with these safe defaults.
 *   The DB holdings fetch (useEffect) updates assets once after mount; React 18
 *   batches this single setState so there is no intermediate bad compute.
 *   Scenario switching (loadScen) sets inp + assets + raw + bucketCfg as four
 *   separate setState calls, which React 18 also batches automatically — so
 *   cashFlow never sees inp from scenario A with assets from scenario B.
 *
 * THIS CONTEXT:
 *   Currently holds separate copies of inp/assets/results that are NOT kept in
 *   sync with App.jsx state. This context exists as the planned migration target —
 *   components can opt in to usePlan() as state is gradually migrated out of App.jsx.
 *   The stubs below (loadFromDB, saveToDB) are intentional placeholders.
 *   DO NOT call recompute() from here — let App.jsx useMemo handle it.
 *
 * userId is set from the logged-in user (AuthContext) via PlanProvider props.
 * When this context is fully wired, pass user.user_id from AppRoot in main.jsx.
 */

export function PlanProvider({ children, userId }) {
  var [inp, setInp] = useState(null);
  var [assets, setAssets] = useState([]);
  var [scenario, setScenario] = useState('base');
  var [results, setResults] = useState(null);
  var [dbStatus, setDbStatus] = useState('offline');

  // recompute: available for future use when state migrates here.
  // Currently NOT called — App.jsx useMemo handles all engine recomputation.
  var recompute = useCallback(function(currentInp, currentAssets, er, derivedTotals) {
    if (!currentInp) return;
    var cashFlow = buildCashFlow(currentInp, er);
    var mc       = runMonteCarlo(currentInp, er, derivedTotals);
    setResults({ cashFlow, mc });
  }, []);

  // TODO: replace with real API call when PlanContext becomes the state owner.
  // Should fetch /api/profile?user_id=userId and populate inp + assets.
  var loadFromDB = useCallback(async function() {
    // stub
  }, [userId]);

  // TODO: replace with real API call. Currently save is handled by domainSave.js
  // functions called directly from App.jsx (syncToDB / domain autosave).
  var saveToDB = useCallback(async function() {
    // stub
  }, [userId, inp]);

  return (
    <PlanContext.Provider value={{
      inp, setInp, assets, setAssets,
      scenario, setScenario,
      results, recompute,
      dbStatus, loadFromDB, saveToDB,
      userId,
    }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  return useContext(PlanContext);
}
