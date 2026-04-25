# docs/decisions.md — Architecture & Technical Decisions

_Last updated: 24 April 2026. If a decision changes, update this file._

---

## Authentication

### Single shared account
All family members use the same email/password. No per-user features, no magic
links, no invites. RLS policies use `auth.uid() = user_id` to scope data to
that one account.

### Middleware in middleware.js
Auth protection must live in `middleware.js` at the project root. Any other
filename is silently ignored by Vercel — the app was fully accessible without
login until this was fixed.

### getSession() in middleware, not getUser()
`getSession()` reads the auth cookie synchronously. `getUser()` makes a network
call to Supabase that can time out, causing middleware to pass unauthenticated
requests through.

---

## Data Model

### Trips vs Legs
A **leg** is one continuous GPS-tracked sail (start → stop). A **trip** is a
named container grouping legs by date range. The database table for legs is
called `legs`; the table for named trips is called `trips`. The UI consistently
uses "leg" for individual sails and "trip" for the named grouping.

### trip_notes.trip_id naming
`trip_notes.trip_id` references `legs.id` — the column is named `trip_id` for
historical reasons. Do not rename without a migration.

### Soft delete on legs
`legs.deleted_at timestamptz` — deletion sets `deleted_at = now()`. All normal
queries filter `.is('deleted_at', null)`. This prevents accidental data loss.

### Auto-delete parent trip when last leg is removed
After soft-deleting a leg, if no remaining legs fall in the trip's date range,
the trip record is also deleted.

---

## Frontend Architecture

### All Trips page is a client component
`app/trips/page.js` uses `'use client'` and fetches via the browser Supabase
client. A server component caused a full network round-trip on every tab switch,
making navigation feel slow. Do not convert this to a server component.

### Timestamps formatted client-side only
Raw ISO strings are passed from server to client; formatting happens in the
browser via `toLocaleTimeString()` / `toLocaleDateString()`. Vercel functions
run in UTC; the boat is in CEST (UTC+2). Server-side formatting caused times
to appear 2 hours behind.

### No explicit `<head>` tag in layout.js
Use Next.js `metadata` export for all head content. A manual `<head>` tag caused
a hydration mismatch that broke client components including all Leaflet maps.

---

## GPS Tracking

### COG/SOG calculated from geometry, not GPS fields
`enrichPoints()` derives course (bearing) and speed (haversine distance ÷ time)
from consecutive track point positions. iOS Safari returns `null` for
`coords.speed` and `coords.heading` — GPS-provided values cannot be relied on.

### 30-second throttle on track points
One GPS point per 30 seconds maximum. Balances data resolution against Supabase
insert volume and battery drain. Points are batched and uploaded every 30 seconds.

### Wake Lock API
`navigator.wakeLock.request('screen')` prevents iOS from suspending the GPS
watch. Re-acquired on `visibilitychange` when the screen is unlocked.

### On screen unlock: reset throttle immediately
When `visibilitychange` fires, `lastRecordedRef` is set to 0 so the next GPS
fix is recorded immediately rather than waiting up to 30 seconds. Elapsed time
is corrected from `startTimeRef`.

### Pending GPS points persisted to localStorage
`pendingPointsRef` is mirrored to `localStorage` keyed by leg ID. On tab return
or app restore, pending points are reloaded so no fixes are lost if the app is
briefly suspended.

### TripContext + localStorage for cross-tab state
Active `legId` and `tripStartTime` are stored in `localStorage` via
`TripContext.js`. Ensures GPS timer and track line survive navigation between
tabs that unmount and remount the tracking page.

---

## Maps

### OpenStreetMap + OpenSeaMap tile layers
OSM provides the base map; OpenSeaMap adds nautical marks, buoys, and depth
contours. Both are free and require no API keys.

### Leaflet imported sequentially, not with Promise.all
```js
import('leaflet').then(async ({ default: L }) => {
  await import('leaflet-gesture-handling')
})
```
The gesture-handling plugin patches Leaflet's prototype and must run after
Leaflet loads. `Promise.all` imports caused a race condition that broke maps
after PWA caching was introduced.

### Two-finger pan via leaflet-gesture-handling
Without this, a single finger simultaneously scrolled the page and panned the
map — unusable on mobile.

### initialCenter from localStorage on Tracking tab
Last known position is read from `localStorage` to zoom the map immediately
before a GPS fix arrives. Without this, the map starts at world view and jumps
after 5–10 seconds.

---

## PWA

### Service worker cache version auto-bumped on build
`package.json` has a `prebuild` script that replaces the cache name in
`public/sw.js` with a timestamp before every `next build`.

### Cache strategy
`/_next/static/` served cache-first (immutable hashed filenames).
Page navigations use network-first so users always get the latest content
when online.

---

## UI Details

### Log Entry tab removed
Event buttons moved to the Tracking tab. They appear below stat cards only
while a leg is recording. `app/log/page.js` is a dead file — delete it.

### Event button layout and colours
Grid is column-first: 3 columns × 2 rows, array order
`[TACK, JIBE, REEF, UNREEF, ENGINE ON, ENGINE OFF]`.
Tack/Jibe: blue (`#1a73e8`). Reef/Unreef: orange (`#f29900`).
Engine On/Off: green (`#34a853`).

### Stop button uses ■ not ⏹
`⏹` (U+23F9) renders with a grey emoji container on iOS. `■` renders cleanly.

### Pencil icon outside the Link on trip cards
Avoids nesting a button inside an anchor (invalid HTML). Opens EditTripModal.

### Back button on leg detail respects origin
`/legs/[id]` accepts `?from=tripId`. If present, back → `/trips/<tripId>`;
otherwise → `/trips`.

### LEG_COLORS exported and reused
Defined in `TripOverviewMap.js`, imported in `TripDetailView.js` so leg badge
colours match map polyline colours.

---

## Version Tags

| Tag | Contents |
|-----|----------|
| `v1.0-secure` | RLS + middleware auth hardening |
| `v1.1-three-tabs` | 3-tab redesign |
| `v1.2-with-position` | Position display + bug fixes |
| `v1.3-pwa-engine` | PWA, Engine On/Off, tab speed |
| `v1.4-refactor` | GPS logic extracted into `useGpsTracking` hook |
| `v1.5-pre-legs-refactor` | Snapshot before trips/legs hierarchy refactor |
| `v1.6-trips-legs-ui` | Trips/legs hierarchy, soft delete, More tab, events on tracking tab, trip overview map |