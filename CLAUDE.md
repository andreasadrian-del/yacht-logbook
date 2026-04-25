# CLAUDE.md — Logbook Nadira

## What This App Is
Mobile PWA for Andreas and family to track sailing trips on yacht Nadira.
A **Trip** is a named container; a **Leg** is one continuous GPS-tracked sail.
Single shared family account. Stack: Next.js App Router, Supabase, Leaflet, Vercel.

- Full architecture: @docs/architecture.md
- Database schema and gotchas: @docs/schema.md
- Why decisions were made: @docs/decisions.md

---

## Architecture

### Supabase access
All Supabase access for new code goes through `/lib/db/`. The layer is complete
for client-side writes and the Route Handler. Server components for data-intensive
reads use the server Supabase client directly — that is acceptable for server-side
code that is not unit-tested.

**Server components that use Supabase directly (acceptable):**
- `app/trips/[id]/page.js` — fetches trip + legs + track points for trip detail
- `app/legs/[id]/page.js` — fetches all leg data, runs enrichPoints + generateTimeline

**Client-side intentional exceptions (do not change without a plan):**
- `app/trips/page.js` — real-time subscription only; data fetching goes through
  the `/api/trips-grouped` Route Handler (tab-switch performance; see decisions.md)
- `app/useGpsTracking.js` — GPS writes go directly to Supabase inside the offline
  queue to preserve `pendingPointsRef` atomicity; do not abstract without a
  tested plan to preserve offline resilience

**Remaining client-side item not yet migrated:**
- `app/page.js` — logbook_entries inserts for event/comment logging; use
  `insertLogbookEntry` from `lib/db/logbook-entries.js` when next touching this file

**The rule for new code:** all new Supabase access in client components and Route
Handlers must go through `/lib/db/`. Do not add direct Supabase calls to client
components outside the exceptions above.

### Component rules
- No component file exceeds 200 lines — split if it does
- Components do one thing: fetch data, manage state, or render UI — not all three
- Reusable UI belongs in `/components/`; route pages only in `/app/`

---

## Data Integrity
- Trip-to-leg grouping by date range runs server-side in the `/api/trips-grouped`
  Route Handler — never move this logic back to the browser
- GPS track writes must be queued and confirmed — never silently drop a point
- All Supabase writes must handle errors explicitly and surface them to the user

---

## Testing
- No feature is complete without tests
- Unit tests: all `/lib/db/` functions, trip-leg grouping logic, any function
  with date or boundary logic — 77 tests currently passing
- Tests live in `/__tests__/` mirroring the source path (e.g. `lib/db/legs.js`
  → `__tests__/lib/db/legs.test.js`)
- Run `npm test` before marking any task done

---

## PWA and Offline
- The localStorage GPS queue (`pendingPointsRef`) is a critical safety net —
  do not refactor without an explicit plan to preserve offline resilience
- Service worker changes require a tested cache invalidation strategy

---

## Do Not
- Add new direct Supabase calls to client components — use `/lib/db/` instead
- Run trip-leg grouping logic client-side — it belongs in the Route Handler
- Use `getUser()` in middleware — reason in @docs/decisions.md
- Use `Promise.all` to import Leaflet plugins — reason in @docs/decisions.md
- Add a manual `<head>` tag in `layout.js` — reason in @docs/decisions.md
- Silently catch errors — log with `console.error` and surface to the user
- Leave `console.log` in committed code — `console.error` only for genuine
  caught errors (upload failures, Supabase errors)
