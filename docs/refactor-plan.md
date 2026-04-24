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

- [ ] Delete `app/log/page.js` (Log Entry tab was removed; file is unused)
- [ ] Verify no import or link anywhere references `/log` after deletion
- [ ] Commit: "Remove dead app/log/page.js"

---

## Phase 1 — Test infrastructure
_Estimated effort: 1–2 hours. No app logic changes._

Sets up the test runner so every subsequent phase can add tests as it goes.

- [ ] Install Jest + React Testing Library: `npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom`
- [ ] Add `jest.config.js` at project root (moduleNameMapper for `@/` alias, testEnvironment jsdom)
- [ ] Add `jest.setup.js` importing `@testing-library/jest-dom`
- [ ] Add `"test": "jest"` script to `package.json`
- [ ] Create `__tests__/` directory with a placeholder `README` confirming the path convention: mirrors source path (e.g. `lib/db/legs.js` → `__tests__/lib/db/legs.test.js`)
- [ ] Verify `npm test` runs with zero tests and exits cleanly
- [ ] Commit: "Add Jest + Testing Library setup"

---

## Phase 2 — `/lib/db/` layer with unit tests
_Estimated effort: 3–4 hours. The foundation everything else builds on._

Create one file per entity under `lib/db/`. Each function wraps a Supabase call, handles the error, and returns `{ data, error }`. No component logic in here — pure data access.

### `lib/db/legs.js`

- [ ] `getLegs(supabase)` — active (non-deleted) legs, ordered by `started_at` desc; selects `id, started_at, ended_at, duration_seconds, distance_nm, last_lat, last_lng`
- [ ] `getLeg(supabase, id, userId)` — single leg by id + user_id guard
- [ ] `getDeletedLegs(supabase)` — legs where `deleted_at IS NOT NULL`, ordered by `deleted_at` desc
- [ ] `createLeg(supabase, userId)` — insert with `started_at` and `user_id`; returns new row
- [ ] `updateLegPosition(supabase, id, lat, lng)` — update `last_lat`, `last_lng`
- [ ] `stopLeg(supabase, id, { endedAt, durationSeconds, distanceNm, lastLat, lastLng })` — update all stop fields
- [ ] `softDeleteLeg(supabase, id)` — set `deleted_at = now()`
- [ ] `restoreLeg(supabase, id)` — set `deleted_at = null`
- [ ] `hardDeleteLeg(supabase, id)` — deletes track_points, logbook_entries, trip_notes, then legs row (in that order)

### `lib/db/trips.js`

- [ ] `getTrips(supabase)` — all trips ordered by `start_date` desc
- [ ] `getTrip(supabase, id, userId)` — single trip by id + user_id guard
- [ ] `createTrip(supabase, { userId, name, startDate, endDate })` — insert
- [ ] `updateTrip(supabase, id, { name, startDate, endDate })` — update
- [ ] `deleteTrip(supabase, id)` — hard delete

### `lib/db/track-points.js`

- [ ] `insertTrackPoints(supabase, legId, points)` — batch insert array of `{ recorded_at, lat, lng, speed, course }`
- [ ] `getTrackPoints(supabase, legId)` — ordered by `recorded_at`; selects `lat, lng, speed, course, recorded_at`
- [ ] `getTrackPointsForLegs(supabase, legIds)` — batch fetch for multiple legs; selects `lat, lng, trip_id`; ordered by `recorded_at`
- [ ] `deleteTrackPoints(supabase, legId)` — hard delete all points for a leg

### `lib/db/logbook-entries.js`

- [ ] `insertLogbookEntry(supabase, { legId, eventType, recordedAt, lat, lng, comment })` — insert
- [ ] `getLogbookEntries(supabase, legId)` — ordered by `recorded_at`
- [ ] `deleteLogbookEntries(supabase, legId)` — hard delete all entries for a leg

### `lib/db/trip-notes.js`

- [ ] `insertNote(supabase, legId, content)` — insert; returns new row
- [ ] `getNotes(supabase, legId)` — ordered by `created_at`
- [ ] `deleteNotes(supabase, legId)` — hard delete all notes for a leg

### Tests (write alongside each file above)

- [ ] `__tests__/lib/db/legs.test.js` — mock Supabase client; test each function: happy path, error path, correct filter applied
- [ ] `__tests__/lib/db/trips.test.js` — same pattern
- [ ] `__tests__/lib/db/track-points.test.js` — same pattern; include the `parseFloat` requirement in `getTrackPoints` return
- [ ] `__tests__/lib/db/logbook-entries.test.js` — same pattern
- [ ] `__tests__/lib/db/trip-notes.test.js` — same pattern
- [ ] `npm test` passes before committing
- [ ] Commit: "Add /lib/db/ layer with unit tests"

---

## Phase 3 — Move trip-to-leg grouping server-side
_Estimated effort: 2–3 hours. Fixes the CLAUDE.md Data Integrity requirement._

Currently `TripsList.js` groups legs under trips in the browser (lines 344–357). This runs after the client fetch and can produce wrong results at date boundaries. It needs to move to a server function so boundary logic is validated once, with access to authoritative data types.

- [ ] Add `groupLegsIntoTrips(trips, legs)` as a pure function in `lib/db/legs.js`
  - Input: array of trip objects, array of leg objects
  - Output: `{ grouped: [{ trip, legs }], standaloneLegs }` sorted by `trip.start_date` desc
  - Same logic as current TripsList.js lines 344–357 but isolated, testable, and importable by server components
- [ ] Write `__tests__/lib/db/legs.test.js` cases for `groupLegsIntoTrips`:
  - [ ] Leg on exact start_date boundary is included
  - [ ] Leg on exact end_date boundary is included
  - [ ] Leg one day outside range is excluded
  - [ ] Leg assigned to first matching trip (by created_at) when trips overlap
  - [ ] Leg with no matching trip appears in standaloneLegs
  - [ ] Already-deleted legs are not passed in (caller responsibility)
- [ ] In `app/trips/page.js`: call `groupLegsIntoTrips` after the parallel fetch, pass `{ grouped, standaloneLegs }` as props to `TripsList`
- [ ] Remove the grouping logic from `TripsList.js` (lines 344–357); receive `grouped` and `standaloneLegs` as props instead
- [ ] `npm test` passes
- [ ] Manually verify All Trips tab still renders correctly
- [ ] Commit: "Move trip-leg grouping out of TripsList into lib/db"

---

## Phase 4 — Split `TripsList.js` (472 lines → under 200 each)
_Estimated effort: 2–3 hours. Component size rule._

`TripsList.js` currently contains: swipe logic, two modals, a card component, a leg row component, and the main list. After Phase 3, the grouping logic is also gone, making the split cleaner.

**Extract to `/components/`:**

- [ ] `components/LegRow.js` — extract `LegRow` function (lines 19–100); pure rendering + swipe gesture; receives `leg`, `tripId`, `isFirst`, `onDelete` as props
- [ ] `components/TripCard.js` — extract `TripCard` function (lines 103–173); receives `trip`, `legs`, `onEdit`, `onDeleteLeg` as props
- [ ] `components/EditTripModal.js` — extract `EditTripModal` (lines 176–238); receives `trip`, `onClose`, `onSaved`; wire Supabase call to `updateTrip` from `lib/db/trips.js`
- [ ] `components/CreateTripModal.js` — extract `CreateTripModal` (lines 241–333); receives `onClose`, `onCreated`; wire Supabase call to `createTrip` from `lib/db/trips.js`
- [ ] `components/ConfirmModal.js` — shared confirm dialog used in TripsList (delete leg confirm) and more/page.js (hard delete confirm); receives `title`, `body`, `confirmLabel`, `confirmStyle`, `onConfirm`, `onCancel`, `loading`

**Update `TripsList.js`:**

- [ ] Replace inline components with imports from `/components/`
- [ ] Wire delete leg to `softDeleteLeg` from `lib/db/legs.js`
- [ ] Verify `TripsList.js` is under 200 lines after extraction
- [ ] Verify each extracted component is under 200 lines

**Verify:**

- [ ] `npm test` passes
- [ ] All Trips tab: create trip, edit trip, expand/collapse, delete leg all work
- [ ] Commit: "Split TripsList into components — LegRow, TripCard, modals"

---

## Phase 5 — Wire remaining known exceptions to `/lib/db/`
_Estimated effort: 1–2 hours. Clears the three exceptions listed in CLAUDE.md._

These three files are listed as known exceptions but should be migrated once the db layer exists.

### `app/more/page.js`
- [ ] Replace `supabase.from('legs').not(...)` with `getDeletedLegs` from `lib/db/legs.js`
- [ ] Replace restore call with `restoreLeg` from `lib/db/legs.js`
- [ ] Replace the four-step hard delete sequence with `hardDeleteLeg` from `lib/db/legs.js`
- [ ] Replace `ConfirmModal` inline markup with shared `components/ConfirmModal.js`

### `app/legs/[id]/LegDetailView.js`
- [ ] Replace inline `supabase.from('trip_notes').insert(...)` with `insertNote` from `lib/db/trip-notes.js`

### Update CLAUDE.md
- [ ] Remove the three exceptions from the Architecture Direction section (they're no longer exceptions)
- [ ] `npm test` passes
- [ ] Commit: "Wire more/page and LegDetailView to /lib/db/; clear exceptions from CLAUDE.md"

---

## Phase 6 — Error handling sweep
_Estimated effort: 1–2 hours. Data Integrity rule: all writes must surface errors to the user._

Audit every write path and confirm it handles errors visibly.

- [ ] `useGpsTracking.js` — `createLeg` failure: show error status instead of silently failing; `stopLeg` failure: show error, do not clear tracking state
- [ ] `components/CreateTripModal.js` — already has error display; confirm it uses `/lib/db/` error return
- [ ] `components/EditTripModal.js` — same
- [ ] `app/more/page.js` — restore and hard delete: show inline error if they fail
- [ ] `app/legs/[id]/LegDetailView.js` — note save failure: show inline error
- [ ] `app/page.js` — event log insert: show transient error toast if it fails (currently silently ignored)
- [ ] Commit: "Explicit error handling on all write paths"

---

## What does NOT change

- `app/trips/page.js` client-side fetch is **intentional** — do not convert to server component (tab-switch performance; documented in decisions.md)
- `TripContext.js` + localStorage — GPS timer continuity across tabs; do not change without a plan to preserve offline resilience
- `useGpsTracking.js` offline queue (`pendingPointsRef`) — critical safety net; do not refactor without preserving it
- Leaflet sequential import pattern — do not switch to `Promise.all`; see decisions.md

---

## Completion checklist

- [ ] Phase 0 complete
- [ ] Phase 1 complete
- [ ] Phase 2 complete — `npm test` green
- [ ] Phase 3 complete — `npm test` green, grouping tests passing
- [ ] Phase 4 complete — no file over 200 lines in app/ or components/
- [ ] Phase 5 complete — no direct Supabase calls outside lib/db/ (except trips/page.js real-time subscription)
- [ ] Phase 6 complete — all write paths surface errors
- [ ] CLAUDE.md updated to reflect completed state
- [ ] `v2.0-refactored` git tag created
