@AGENTS.md

# Logbook Nadira — Project Decisions & Context

A sailing GPS logbook PWA for Andreas's yacht Nadira. Built with Next.js App Router, Supabase (Postgres + Auth), Leaflet maps, deployed on Vercel.

---

## Architecture decisions

### Single shared account
All family members log in with the same email/password. No per-user features, no magic links, no invites. RLS policies use `auth.uid() = user_id` to scope data to that one account.

### Trips vs Legs
A **leg** is one continuous GPS-tracked sail (start → stop). A **trip** is a named container grouping legs by date range. The database table for legs is called `legs`; the table for named trips is called `trips`. The UI consistently uses "leg" for individual sails and "trip" for the named grouping.

### All Trips page is a client component
`app/trips/page.js` uses `'use client'` and fetches via the browser Supabase client. A server component caused a full network round-trip on every tab switch, making navigation feel slow. Client-side fetch with RLS handles auth filtering automatically.

### COG/SOG calculated from geometry, not GPS fields
`enrichPoints()` in `app/legs/[id]/page.js` derives course (bearing) and speed (haversine distance ÷ time) from consecutive track point positions. iOS Safari returns `null` for `coords.speed` and `coords.heading` — the GPS-provided values cannot be relied on.

### Timestamps formatted client-side only
Raw ISO strings are passed from server components to client components; formatting happens in the browser using `toLocaleTimeString()` / `toLocaleDateString()`. Vercel functions run in UTC; the boat is in CEST (UTC+2). Formatting server-side caused times to appear 2 hours behind.

### Leaflet imported sequentially, not with Promise.all
```js
import('leaflet').then(async ({ default: L }) => {
  await import('leaflet-gesture-handling')
  ...
})
```
The gesture-handling plugin patches Leaflet's prototype and must run after Leaflet loads. Parallel `Promise.all` imports caused a race condition that broke maps after PWA caching was introduced.

### No explicit `<head>` tag in layout.js
Use Next.js `metadata` export for all head content. A manual `<head>` tag caused a hydration mismatch that broke client components, including all Leaflet maps.

### Middleware in middleware.js
Auth protection must live in `middleware.js` at the project root. `proxy.js` or any other name is silently ignored by Vercel's build system — the app was fully accessible without login until this was fixed.

### getSession() in middleware, not getUser()
`getSession()` reads the auth cookie synchronously. `getUser()` makes a network call to Supabase that can time out, causing the middleware to pass unauthenticated requests through.

---

## GPS tracking decisions

### 30-second throttle on track points
One GPS point recorded per 30 seconds maximum. Balances data resolution against Supabase insert volume and battery drain. Points are batched client-side and uploaded every 30 seconds.

### Wake Lock API to keep screen on
`navigator.wakeLock.request('screen')` prevents iOS from suspending the page (and the GPS watch) when the screen locks. Re-acquired on `visibilitychange` when the screen is unlocked.

### On screen unlock: reset throttle immediately
When `visibilitychange` fires and the screen becomes visible again, `lastRecordedRef` is set to 0 so the next GPS fix is recorded immediately rather than waiting up to 30 seconds. Elapsed time is also corrected from `startTimeRef` to account for time that passed while locked.

### Pending GPS points persisted to localStorage
`pendingPointsRef` (points not yet uploaded) is mirrored to `localStorage` keyed by leg ID. On tab return or app restore, pending points are reloaded so no fixes are lost if the app is briefly suspended between upload intervals.

### TripContext + localStorage for cross-tab state
Active `legId` and `tripStartTime` are stored in `localStorage` via `TripContext.js`. This ensures the GPS timer and track line survive navigation between the Tracking, Log Entry, and All Trips tabs, which unmount and remount the tracking page.

---

## Map decisions

### OpenStreetMap + OpenSeaMap tile layers
OSM provides the base map; OpenSeaMap adds nautical marks, buoys, and depth contours as a semi-transparent overlay. Both are free and don't require API keys.

### Two-finger pan via leaflet-gesture-handling
Without gesture handling, a single finger would both scroll the page and pan the map simultaneously, making the UI unusable on mobile. The plugin requires a two-finger gesture to pan, which matches standard mobile map UX.

### initialCenter from localStorage on Tracking tab
On app open, the last known position is read from `localStorage` to zoom the map immediately before a GPS fix arrives. Without this, the map starts at a default world view and jumps to the current position only after 5–10 seconds.

---

## Database schema notes

- `track_points.lat` and `track_points.lng` are `numeric`, not `double precision` — always call `parseFloat()` before doing JS math on them.
- `logbook_entries.event_type` values: `tack`, `jibe`, `reef`, `unreef`, `engine on`, `engine off`, `comment`.
- `trip_notes.trip_id` references `legs.id` (the column is named `trip_id` for historical reasons).
- RLS on `track_points`, `logbook_entries`, and `trip_notes` gates access via `trip_id IN (SELECT id FROM legs WHERE user_id = auth.uid())`.

---

## PWA decisions

### Service worker cache version auto-bumped on build
`package.json` has a `prebuild` script that replaces the cache name in `public/sw.js` with a timestamp before every `next build`. This ensures deployed users always receive fresh assets without manual version bumping.

### Cache-first for static assets, network-first for navigation
`/_next/static/` is served cache-first (immutable hashed filenames). Page navigations use network-first so users always get the latest server-rendered content when online.

---

## Version tags (git)

| Tag | Contents |
|-----|----------|
| `v1.0-secure` | RLS + middleware auth hardening |
| `v1.1-three-tabs` | 3-tab redesign |
| `v1.2-with-position` | Position display + bug fixes |
| `v1.3-pwa-engine` | PWA, Engine On/Off buttons, tab speed |
| `v1.4-refactor` | GPS logic extracted into `useGpsTracking` hook |
| `v1.5-pre-legs-refactor` | Snapshot before trips/legs hierarchy refactor |
