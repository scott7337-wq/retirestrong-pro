# Security Status — RetireStrong Pro

## ⚠️ INTERNAL TEST USE ONLY

**Current authentication is for internal/private testing only and is NOT production secure.**

Do not share login credentials or expose this server publicly until real auth is in place.

---

## What the current auth does (and doesn't do)

| Feature | Current state |
|---|---|
| Authentication | Email address only — no password |
| user_id storage | localStorage (no expiry, no signature) |
| Session tokens | None |
| Request signing | None — user_id is trusted from client |
| Cross-user isolation | user_id verified to exist in DB, but any client can pass any valid UUID |
| HTTPS | Not enforced — localhost only |
| Rate limiting | None |

The most significant gap: **any client that knows another user's UUID can read their data** by passing it as `?user_id=`. This is acceptable for a 4-person internal test but must be closed before any public exposure.

---

## Current state (private beta)

- Email-only login, no password — `POST /api/auth/login` returns user record with no credential check
- user_id persisted in localStorage as `rs_user_id`
- Backend verifies `user_id` exists in the `users` table — does NOT verify that the calling client owns that UUID
- Save calls (domainSave.js) read user_id from localStorage at call time

## Before public launch

- [ ] Replace email-only login with Supabase Auth, Auth0, or Clerk (see `AUTH_MIGRATION.md`)
- [ ] Add JWT or signed session tokens — never trust bare user_id from client
- [ ] Add rate limiting to auth endpoints (`express-rate-limit`)
- [ ] Full audit of all `/api` routes for correct ownership enforcement
- [ ] HTTPS required — add TLS at reverse proxy or use managed hosting
- [ ] Add CSRF protection for state-mutating endpoints
- [ ] Audit and rotate all secrets in `.env`
- [ ] Remove or gate test accounts before any public exposure

## Test accounts (internal only)

These accounts exist in the DB for private testing. **Remove or disable before any public launch.**

| Email | Purpose |
|---|---|
| scott7337@gmail.com | Real household — primary dev account |
| scott@test.com | Test alias for real household |
| demo1@test.com | Demo Household A (early retiree) |
| demo2@test.com | Demo Household B (conservative couple) |
| demo3@test.com | Demo Household C (high healthcare) |
