# Auth Migration Guide — RetireStrong Pro

## What is temporary vs. permanent

### Temporary (replace when adding real auth)

| File | What to replace |
|---|---|
| `server.cjs` — `POST /api/auth/login` | Email-only lookup → real credential check or provider callback |
| `server.cjs` — `GET /api/auth/me` | Simple DB lookup → validate signed JWT/session token |
| `server.cjs` — user_id middleware | Existence check only → verify JWT signature + ownership |
| `src/context/AuthContext.jsx` | Entire file — swap for provider SDK (Supabase, Auth0, Clerk) |
| `src/components/auth/LoginScreen.jsx` | Email input → provider login button or SDK-managed flow |
| `src/main.jsx` — `AppRoot` | `useAuth()` check is fine — just the underlying AuthContext changes |

### Permanent (survives into real auth)

| File | What survives |
|---|---|
| `src/data/domainSave.js` — `uid()` | Reads `rs_user_id` from localStorage — keep the pattern, just ensure real auth also stores user_id there |
| `src/api.js` — `getUserId()` | Same pattern — localStorage read is fine if real auth keeps user_id there |
| `server.cjs` — `/api` middleware structure | The "skip auth routes, require user_id on data routes" pattern is correct — just strengthen the check |
| `src/data/seed-test-households.sql` | DB schema (users + households tables) survives — just add test accounts table to cleanup checklist |
| `SECURITY.md` | Keep and update as auth matures |

---

## Recommended migration: Supabase Auth

Supabase is the lowest-friction path given the existing PostgreSQL setup.

### What changes

1. **`server.cjs`** — Replace user_id middleware with Supabase JWT verification:
   ```js
   const { createClient } = require('@supabase/supabase-js');
   // Verify Bearer token from Authorization header
   // Replace req.userId = userId with Supabase's authenticated user
   ```

2. **`src/context/AuthContext.jsx`** — Replace with `@supabase/auth-helpers-react`:
   ```jsx
   import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
   // login/logout handled by Supabase SDK
   ```

3. **`src/components/auth/LoginScreen.jsx`** — Replace with Supabase Auth UI or magic link flow.

4. **`src/data/domainSave.js`** — Keep `uid()` pattern; Supabase session provides `session.user.id`.

5. **`src/main.jsx`** — Wrap with `SessionContextProvider` from `@supabase/auth-helpers-react`.

### What does NOT change

- All `/api` route handlers — they already expect `req.userId`
- `domainSave.js` save logic — keep as-is, just update `uid()` source
- Database schema — no changes needed; `users.user_id` is already UUID

---

## Current user_id flow (for reference)

```
Login → server returns { user_id } → AuthContext stores in localStorage('rs_user_id')
                                          ↓
                              domainSave.uid() reads it
                              api.getUserId() reads it
                              server middleware validates it exists in users table
```

After real auth, this becomes:
```
Login → provider returns signed JWT → store in memory (not localStorage)
                                           ↓
                               Pass as Authorization: Bearer header
                               Server verifies signature, extracts user_id
                               Never trust client-supplied user_id
```
