# docs/refactor-plan.md — Refactoring Plan

_Created: 24 April 2026. Tick boxes as work completes. Each phase should leave the app fully working._

---

## Goal

Move the codebase toward the target picture in CLAUDE.md:
- All Supabase access through `/lib/db/` (new code rule; three named exceptions stay)
- No component file over 200 lines
- Components do one thing
- Trip-to-leg grouping runs server-side, not client-side
- All writes surface errors to the user
- Every new function has a unit test

The phases are ordered so each one builds on the last and the app stays shippable throughout.

---

## Phase 0 — Remove dead code
_Estimated effort: 15 minutes. No risk._

- [x] Delete `app/log/page.js` (Log Entry tab was removed; file is unused)
- [x] Verify no import or link anywhere references `/log` after deletion
- [x] Commit: "Remove dead app/log/page.js"

---

## Phase 1 — Test infrastructure
_Estimated effort: 1–2 hours. No app logic changes._

Sets up the test runner so every subsequent phase can add tests as it goes.

- [x] Install Jest + React Testing Library: `npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom`
- [x] Add `jest.config.js` at project root (moduleNameMapper for `@/` alias, testEnvironment jsdom)
- [x] Add `jest.setup.js` importing `@testing-library/jest-dom`
- [x] Add `"test": "jest"` script to `package.json`
- [x] Create `__tests__/` directory with a placeholder `README` confirming the path convention: mirrors source path (e.g. `lib/db/legs.js` → `__tests__/lib/db/legs.test.js`)
- [x] Verify `npm test` runs with zero tests and exits cleanly
- [x] Commit: "Add Jest + Testing Library setup"

---

## Phase 2a — `/lib/db/` core entities with unit tests
_Estimated effort: 2 hours. The two most important files; everything else depends on them._

Create `lib/db/legs.js` and `lib/db/trips.js`. Each function wraps a Supabase call, handles the error, and returns `{ data, error }`. No component logic — pure data access.

### `lib/db/legs.js`

- [x] `getLegs(supabase)` — active (non-deleted) legs, ordered by `started_at` desc; selects `id, started_at, ended_at, duration_seconds, distance_nm, last_lat, last_lng`
- [x] `getLeg(supabase, id, userId)` — single leg by id + user_id guard
- [x] `getDeletedLegs(supabase)` — legs where `deleted_at IS NOT NULL`, ordered by `deleted_at` desc
- [x] `createLeg(supabase, userId)` — insert with `started_at` and `user_id`; returns new row
- [x] `updateLegPosition(supabase, id, lat, lng)` — update `last_lat`, `last_lng`
- [x] `stopLeg(supabase, id, { endedAt, durationSeconds, distanceNm, lastLat, lastLng })` — update all stop fields
- [x] `softDeleteLeg(supabase, id)` — set `deleted_at = now()`
- [x] `restoreLeg(supabase, id)` — set `deleted_at = null`
- [x] `hardDeleteLeg(supabase, id)` — deletes track_points, logbook_entries, trip_notes, then legs row (in that order)

### `lib/db/trips.js`

- [x] `getTrips(supabase)` — all trips ordered by `start_date` desc
- [x] `getTrip(supabase, id, userId)` — single trip by id + user_id guard
- [x] `createTrip(supabase, { userId, name, startDate, endDate })` — insert
- [x] `updateTrip(supabase, id, { name, startDate, endDate })` — update
- [x] `deleteTrip(supabase, id)` — hard delete

### Tests

- [x] `__tests__/lib/db/legs.test.js` — mock Supabase client; test each function: happy path, error path, correct filter applied
- [x] `__tests__/lib/db/trips.test.js` — same pattern
- [x] `npm test` passes before committing
- [x] Commit: "Add lib/db/legs.js and lib/db/trips.js with unit tests"

---

## Phase 2b — `/lib/db/` supporting entities with unit tests
_Estimated effort: 1–2 hours. Lower complexity; depends on 2a pattern being established._

### `lib/db/track-points.js`

- [x] `insertTrackPoints(supabase, legId, points)` — batch insert array of `{ recorded_at, lat, lng, speed, course }`
- [x] `getTrackPoints(supabase, legId)` — ordered by `recorded_at`; selects `lat, lng, speed, course, recorded_at`
- [x] `getTrackPointsForLegs(supabase, legIds)` — batch fetch for multiple legs; selects `lat, lng, trip_id`; ordered by `recorded_at`
- [x] `deleteTrackPoints(supabase, legId)` — hard delete all points for a leg

### `lib/db/logbook-entries.js`

- [x] `insertLogbookEntry(supabase, { legId, eventType, recordedAt, lat, lng, comment })` — insert
- [x] `getLogbookEntries(supabase, legId)` — ordered by `recorded_at`
- [x] `deleteLogbookEntries(supabase, legId)` — hard delete all entries for a leg

### `lib/db/trip-notes.js`

- [x] `insertNote(supabase, legId, content)` — insert; returns new row
- [x] `getNotes(supabase, legId)` — ordered by `created_at`
- [x] `deleteNotes(supabase, legId)` — hard delete all notes for a leg

### Tests

- [x] `__tests__/lib/db/track-points.test.js` — include test that `getTrackPoints` applies `parseFloat` to lat/lng before returning
- [x] `__tests__/lib/db/logbook-entries.test.js` — happy path, error path, correct filter
- [x] `__tests__/lib/db/trip-notes.test.js` — same pattern
- [x] `npm test` passes before committing
- [x] Commit: "Add lib/db/ supporting entities (track-points, logbook-entries, trip-notes) with unit tests"

---

## Phase 3 — Move trip-to-leg grouping server-side
_Estimated effort: 2–3 hours. Fixes the CLAUDE.md Data Integrity requirement._

Currently `TripsList.js` groups legs under trips in the browser (lines 344–357). This runs after the client fetch and can produce wrong results at date boundaries.

`app/trips/page.js` must stay a client component (tab-switch performance — see decisions.md), so calling `groupLegsIntoTrips` there would still run it in the browser. The solution is a **Next.js Route Handler** (`app/api/trips-grouped/route.js`). It runs on the server, fetches both tables, runs the grouping, and returns the result as JSON. `trips/page.js` fetches from this endpoint instead of Supabase directly — it is still a client-initiated fetch, so there is no full page re-render on tab switch and the performance reason is preserved. The one trade-off is an extra network hop (browser → Vercel → Supabase); this is acceptable for a family app with small data volumes.

### `lib/db/legs.js` — add pure grouping function

- [x] Add `groupLegsIntoTrips(trips, legs)` as a pure (no Supabase) function in `lib/db/legs.js`
  - Input: array of trip objects, array of leg objects (already filtered, no deleted legs)
  - Output: `{ grouped: [{ trip, legs }], standaloneLegs }` sorted by `trip.start_date` desc
  - Same logic as current TripsList.js lines 344–357 but isolated and testable

### Tests for `groupLegsIntoTrips`

- [x] Add to `__tests__/lib/db/legs.test.js`:
  - [x] Leg on exact `start_date` boundary is included
  - [x] Leg on exact `end_date` boundary is included
  - [x] Leg one day outside range is excluded
  - [x] Leg assigned to first matching trip (by `created_at`) when trips overlap
  - [x] Leg with no matching trip appears in `standaloneLegs`
  - [x] Empty trips array → all legs are standaloneLegs
  - [x] Empty legs array → grouped entries all have empty legs arrays

### Route Handler

- [x] Create `app/api/trips-grouped/route.js` (server-side Route Handler)
  - Uses `createClient()` from `lib/supabase-server.js`
  - Calls `getTrips` and `getLegs` from `lib/db/` in parallel
  - Calls `groupLegsIntoTrips` on the results
  - Returns `Response.json({ grouped, standaloneLegs })`
  - Returns `Response.json({ error: '...' }, { status: 500 })` on failure

### Update `app/trips/page.js`

- [x] Replace the two direct Supabase calls with a single `fetch('/api/trips-grouped')`
- [x] Real-time subscription stays — it calls `fetchAll` which now hits the Route Handler instead of Supabase; behaviour is unchanged
- [x] Remove the grouping logic from `TripsList.js` (lines 344–357); receive `grouped` and `standaloneLegs` as props instead

### Verify

- [x] `npm test` passes
- [ ] Manually verify All Trips tab: named trips, standalone legs, and real-time update on new leg all work
- [x] Commit: "Move trip-leg grouping to server-side Route Handler"

---

## Phase 4 — Split `TripsList.js` (472 lines → under 200 each)
_Estimated effort: 2–3 hours. Component size rule._

`TripsList.js` currently contains: swipe logic, two modals, a card component, a leg row component, and the main list. After Phase 3, the grouping logic is also gone, making the split cleaner.

**Extract to `/components/`:**

- [x] `components/LegRow.js` — extract the `LegRow` function from `TripsList.js`; pure rendering + swipe gesture; receives `leg`, `tripId`, `isFirst`, `onDelete` as props
- [x] `components/TripCard.js` — extract the `TripCard` function from `TripsList.js`; receives `trip`, `legs`, `onEdit`, `onDeleteLeg` as props
- [x] `components/EditTripModal.js` — extract the `EditTripModal` function from `TripsList.js`; receives `trip`, `onClose`, `onSaved`; wire Supabase call to `updateTrip` from `lib/db/trips.js`
- [x] `components/CreateTripModal.js` — extract the `CreateTripModal` function from `TripsList.js`; receives `onClose`, `onCreated`; wire Supabase call to `createTrip` from `lib/db/trips.js`
- [x] `components/ConfirmModal.js` — shared confirm dialog used in TripsList (delete leg confirm) and more/page.js (hard delete confirm); receives `title`, `body`, `confirmLabel`, `confirmStyle`, `onConfirm`, `onCancel`, `loading`

**Update `TripsList.js`:**

- [x] Replace inline components with imports from `/components/`
- [x] Wire delete leg to `softDeleteLeg` from `lib/db/legs.js`
- [x] Verify `TripsList.js` is under 200 lines after extraction
- [x] Verify each extracted component is under 200 lines

**Verify:**

- [x] `npm test` passes
- [ ] All Trips tab: create trip, edit trip, expand/collapse, delete leg all work
- [x] Commit: "Split TripsList into components — LegRow, TripCard, modals"

---

## Phase 5 — Wire remaining known exceptions to `/lib/db/`
_Estimated effort: 1–2 hours. Clears the three exceptions listed in CLAUDE.md._

These three files are listed as known exceptions but should be migrated once the db layer exists.

### `app/more/page.js`
- [x] Replace `supabase.from('legs').not(...)` with `getDeletedLegs` from `lib/db/legs.js`
- [x] Replace restore call with `restoreLeg` from `lib/db/legs.js`
- [x] Replace the four-step hard delete sequence with `hardDeleteLeg` from `lib/db/legs.js`
- [x] Replace `ConfirmModal` inline markup with shared `components/ConfirmModal.js`

### `app/legs/[id]/LegDetailView.js`
- [x] Replace inline `supabase.from('trip_notes').insert(...)` with `insertNote` from `lib/db/trip-notes.js`

### Update CLAUDE.md
- [x] Remove the three exceptions from the Architecture Direction section (they're no longer exceptions)
- [x] `npm test` passes
- [x] Commit: "Wire more/page and LegDetailView to /lib/db/; clear exceptions from CLAUDE.md"

---

## Phase 6 — Error handling sweep
_Estimated effort: 1–2 hours. Data Integrity rule: all writes must surface errors to the user._

Audit every write path and confirm it handles errors visibly.

- [x] `useGpsTracking.js` — `createLeg` failure: show error status instead of silently failing; `stopLeg` failure: show error, do not clear tracking state
- [x] `components/CreateTripModal.js` — already has error display; confirm it uses `/lib/db/` error return
- [x] `components/EditTripModal.js` — same
- [x] `app/more/page.js` — restore and hard delete: show inline error if they fail
- [x] `app/legs/[id]/LegDetailView.js` — note save failure: show inline error
- [x] `app/page.js` — event log insert: show transient error toast if it fails (currently silently ignored)
- [x] Commit: "Explicit error handling on all write paths"

---

## What does NOT change

- `app/trips/page.js` client-side fetch is **intentional** — do not convert to server component (tab-switch performance; documented in decisions.md)
- `TripContext.js` + localStorage — GPS timer continuity across tabs; do not change without a plan to preserve offline resilience
- `useGpsTracking.js` offline queue (`pendingPointsRef`) — critical safety net; do not refactor without preserving it
- Leaflet sequential import pattern — do not switch to `Promise.all`; see decisions.md

---

## Completion checklist

- [x] Phase 0 complete
- [x] Phase 1 complete
- [x] Phase 2a complete — `npm test` green, legs.js + trips.js covered
- [x] Phase 2b complete — `npm test` green, all five db files covered
- [x] Phase 3 complete — `npm test` green, grouping tests passing, Route Handler in place
- [x] Phase 4 complete — no file over 200 lines in app/ or components/
- [x] Phase 5 complete — no direct Supabase calls outside lib/db/ (except trips/page.js real-time subscription)
- [x] Phase 6 complete — all write paths surface errors
- [x] CLAUDE.md updated to reflect completed state
- [x] `v2.0-refactored` git tag created
