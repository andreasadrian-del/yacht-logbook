# CLAUDE.md — Logbook Nadira

## Meta
When creating any directory marked "does not exist yet", remove that
note from this file as part of the same task.

## What This App Is
Mobile PWA for Andreas and family to track sailing trips on yacht Nadira.
A **Trip** is a named container; a **Leg** is one continuous GPS-tracked sail.
Single shared family account. Stack: Next.js App Router, Supabase, Leaflet, Vercel.

- Full architecture: @docs/architecture.md
- Database schema and gotchas: @docs/schema.md
- Why decisions were made: @docs/decisions.md

---

## Architecture Direction
We are migrating toward routing all Supabase access through `/lib/db/`.
This is a goal, not the current state — several pages still call Supabase
directly for historical reasons.

**Known exception (intentional — do not change):**
- `app/trips/page.js` — uses the browser Supabase client directly for the real-time subscription only; data fetching goes through the `/api/trips-grouped` Route Handler

**The rule for new code:** all new Supabase access must go through `/lib/db/`.
When touching existing code, refactor toward this pattern — do not add new
direct Supabase calls outside of the exception listed above.

---

## Component Rules
- No component file exceeds 200 lines — split if it does
- Components do one thing: fetch data, manage state, or render UI — not all three
- Reusable UI belongs in `/components/`; route pages only in `/app/`

---

## Data Integrity
- Trip-to-Leg grouping by date range must never run client-side only — belongs
  in a server function or Postgres query where boundary conditions are validated
- GPS track writes must be queued and confirmed — never silently drop a point
- All Supabase writes must handle errors explicitly and surface them to the user

---

## Dead Code
- `app/log/page.js` is a dead file — the Log Entry tab was removed
- Confirm and delete before doing any work nearby
- Do not work around dead code — remove it

---

## Testing — Non-Negotiable
- No feature is complete without tests
- Unit tests: all `/lib/db/` functions, trip-leg grouping logic, GPS queue
  logic, any function with date or boundary logic
- Integration tests: all data write flows (create trip, create leg, log event,
  soft delete, restore)
- Tests live in `/__tests__/` mirroring the source path
- Run tests before marking any task done

---

## PWA and Offline
- The localStorage GPS queue (`pendingPointsRef`) is a critical safety net —
  do not refactor without an explicit plan to preserve offline resilience
- Service worker changes require a tested cache invalidation strategy

---

## Do Not
- Call Supabase from inside a React component or page directly
- Run trip-leg grouping logic client-side
- Use `getUser()` in middleware — reason in @docs/decisions.md
- Use `Promise.all` to import Leaflet plugins — reason in @docs/decisions.md
- Add a manual `<head>` tag in `layout.js` — reason in @docs/decisions.md
- Silently catch errors — log with context and surface to the user
- Leave `console.log` in committed code — use `console.error` only
  for genuine caught errors (e.g. upload failures)