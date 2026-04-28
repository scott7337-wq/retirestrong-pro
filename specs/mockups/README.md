# RetireStrong UI Mockups

Prototypes built in Perplexity, April 2026.
These are the design target for Phase B (two-pane AI layout) and Phase B.2 (compare view).

## Files

- `index.html` + `styles.css` + `app.js` — Phase B target: the two-pane Explore/Commit layout with working scenario, diff strip, pin flow, and chat
- `compare.html` + `compare.css` + `compare.js` — Phase B.2 target: side-by-side scenario comparison with AI lens switching

## What to preserve from these mockups

### Design tokens (already match the app)
- Accent: `#01696F` (teal) — matches `--rs-teal-dark`
- Working scenario: `#B8651A` (orange) — new color, use for ephemeral state
- Background: `#F7F6F2` — matches `--rs-bg-page`

### Interaction patterns to implement exactly
- Diff strip with pulsing orange dot when working scenario is active
- Working scenario tab uses dashed border, promotes to solid on pin
- Pin modal flow: name input → promotes working tab → named tab
- Tool-call disclosure row on every AI message (collapsed by default)
- Disclaimer footer: "This is education, not investment advice." on every AI response
- Suggestion chips after every AI response
- Explore/Commit mode toggle in topbar

### Phase B layout
- Two-pane: 42% chat / 58% plan (narrows to 32/68 in Commit mode)
- Chat pane is primary interaction surface
- Plan pane shows live data responding to chat

### Phase B.2 compare view
- Dimension tabs: Plan / Taxes / Monte Carlo / Income
- AI verdict strip at top with expandable explanation
- Side-by-side cards with mini charts
- Pinned observations system

## Build order
Phase A: upgrade existing AI rail to real conversation (Brief 7)
Phase B: adopt two-pane layout as "Explore" mode (Brief 8+)
Phase B.2: compare view (Brief 9+)
