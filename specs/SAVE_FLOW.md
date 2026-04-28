# Save Flow — RetireStrong Pro

## The three save paths

### 1. Domain autosave (automatic, per field)
**Trigger:** User edits any field via `setField()` in Settings/Assumptions tabs  
**What it saves:** The specific domain that owns that field (Profile, SS, Roth, Healthcare, Expenses, QCD)  
**Where:** PostgreSQL via domain-specific PUT endpoints (`/api/profile`, `/api/social_security/1`, etc.)  
**Implementation:** `scheduleDomainSave()` in App.jsx — 1.5s debounce, fires `domainSave.js` functions  
**user_id source:** `localStorage.getItem('rs_user_id')` via `uid()` in domainSave.js  

### 2. syncToDB — explicit full sync (Sync button)
**Trigger:** User clicks the "Sync" button in the Sidebar footer  
**What it saves:** All durable `inp` fields across all domains in parallel via `saveAllDurable(inp)`  
**Where:** PostgreSQL via the same domain endpoints as autosave  
**What it does NOT save:** Assets/holdings (managed via `/api/holdings` separately), computed results  
**Implementation:** `syncToDB` useCallback in App.jsx → `saveAllDurable(inp)` in domainSave.js  

### 3. saveSilently — local scenario snapshot (Save button)
**Trigger:** User clicks "Save" button in the Sidebar footer  
**What it saves:** Current `inp` + `assets` + `bucketCfg` into the in-memory `scenarios` React state  
**Where:** React state only — NOT persisted to DB or localStorage  
**Durability:** ⚠️ Lost on page refresh. This is a session-scoped snapshot for scenario comparison only.  
**What it does NOT save:** Anything to DB. Use Sync for DB persistence.  

---

## What is and isn't persisted

| Data | Persisted | How |
|---|---|---|
| Plan inputs (inp) | ✅ DB | Domain autosave + Sync button |
| Assets / holdings | ✅ DB | Separate `/api/holdings` endpoints (Portfolio tab) |
| Scenario snapshots | ❌ Session only | `scenarios` React state (saveSilently) |
| Bucket config | ❌ Session only | In-memory state (no dedicated endpoint yet) |
| Computed results (cashFlow, mcData) | Never | Derived from inp — always recomputed on load |
| Wizard completion flag | ✅ localStorage | `rs_wizard_done` key |
| Auth user_id | ✅ localStorage | `rs_user_id` key (see AUTH_MIGRATION.md) |

---

## What gets recomputed vs. loaded

On every page load:
1. `inp` is fetched from DB (via v14 read routes) and hydrated via `flattenPlan()`
2. `assets` are fetched from `/api/holdings`
3. `cashFlow` and `mcData` are computed by `useMemo` using `inpWithAssets` and `er`
4. Results are **never stored** — they are always derived

This means there is no stale-result problem: if inp or assets change, the engine reruns automatically.

---

## Multiple save entry points

There are currently two DB save entry points that partially overlap:
- `setField` → `scheduleDomainSave` (per-field autosave)
- `syncToDB` → `saveAllDurable` (all-domains explicit save)

Both use the same underlying `domainSave.js` functions. This is intentional — autosave is optimistic and domain-scoped; sync is a user-initiated full checkpoint. They do not conflict.

If both fire simultaneously (user edits a field and immediately clicks Sync), the debounce timer in autosave is cleared by the explicit sync path, so no double-write occurs.
