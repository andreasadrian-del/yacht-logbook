# docs/decisions.md — Architecture & Technical Decisions

_Last updated: 25 April 2026. If a decision changes, update this file._

---

## iOS Architecture Decisions

> These are the active decisions for the current iOS app build.

### Replacing web app with native iOS app
The Next.js PWA is retired. The iOS app handles all recording and history
viewing. A read-only website may be built in future that reads from the
same Supabase tables.

### TestFlight distribution
App distributed via TestFlight internal testing — not the public App Store.
Requires Apple Developer Program membership.

### Background mode: Location Updates, not VoIP
`Location Updates` background entitlement keeps NWConnection alive when the
screen is locked. VoIP would also work technically but Apple flags it for
non-VoIP apps even on TestFlight internal builds.

### SwiftData over CoreData
iOS 17+ minimum target allows SwiftData. Automatic lightweight migrations
align with the extensible NMEA architecture — adding a new field requires
only a new property, no migration file.

### Dual network routing: Zeus3 WiFi + LTE simultaneously
iOS 13+ automatically routes local traffic (192.168.1.1) over WiFi and
internet traffic (Supabase) over Cellular when the WiFi network has no
internet. No special socket binding required. Verify NWPathMonitor behaviour
on first on-boat test.

### Zeus3 as NMEA source, no additional hardware required
The B&G Zeus3 has built-in WiFi and streams all N2K bus data as NMEA 0183
sentences over TCP on port 10110. No YDWG-02 gateway needed unless the
Zeus3 WiFi proves unreliable in practice.

### Offline buffering strategy
When LTE is unavailable (offshore), NMEA data is buffered locally in
SwiftData. Upload to Supabase resumes automatically when NWPathMonitor
detects cellular connectivity restored.

### $IIXDR heel angle field layout unverified
B&G typically outputs `$IIXDR,A,<value>,D,HEEL` but this must be verified
against actual Zeus3 output on first on-boat test. Developer/Test Mode shows
all raw `$IIXDR` sentences live so the actual field layout can be confirmed.

### Full feature set in v1.0 — no phasing
The iOS app builds everything in one go: Trips, Legs, History, Notes, Event
logging, NMEA recording and live display. No deferred phases. The web app is
fully retired on v1.0 release.

### Developer/Test Mode
Accessible only when a `DEBUG_MODE` flag is set in app settings. Contains:
- Raw NMEA sentence log (scrolling, filterable by sentence type)
- All raw `$IIXDR` sentences displayed as they arrive
- First On-Boat Checklist — pass/fail toggles and notes fields for each item:
  1. Zeus3 TCP connection establishes successfully on 192.168.1.1:10110
  2. Raw NMEA sentences appear in the debug log
  3. All expected sentence types received ($GPRMC, $IIMWV, $IIDBT, $IIVHW, $IIMTW, $IIHDG, $IIXDR etc.)
  4. $IIXDR heel angle parses correctly — verify field layout matches $IIXDR,A,<value>,D,HEEL
  5. Position, SOG and COG display correctly and match the Zeus3 screen
  6. Fallback to iPhone GPS triggers correctly when TCP connection is dropped
  7. Automatic reconnection works when TCP connection is restored
  8. Screen locks — TCP connection stays alive and data keeps flowing
  9. NWPathMonitor correctly detects cellular internet while on Zeus3 WiFi
  10. Supabase upload works in real time over cellular while connected to Zeus3 WiFi
  11. Offline buffering activates correctly when cellular is disabled
  12. Buffered data syncs to Supabase when cellular is restored
  13. Data source metadata field correctly records Zeus3 vs Phone GPS in Supabase

### Data source priority: Zeus3 over iPhone GPS
Zeus3 TCP is always preferred for position, SOG and COG. iPhone GPS
(CoreLocation) is used as automatic silent fallback if no valid NMEA
position sentence has been received for more than 5 seconds. Every Supabase
record includes a `data_source` field (`zeus3` or `phone_gps`).

### Wind data: four distinct fields
Apparent wind angle and true wind angle from `$IIMWV` are bow-relative.
True wind direction from `$IIMWD` is an absolute compass bearing. These
are fundamentally different values — always store them in separate fields,
never conflate them.

---

## Data Model Decisions
_(Active — applies to both web app history and iOS app)_

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

## Authentication Decisions
_(Active — Supabase auth model unchanged in iOS app)_

### Single shared account
All family members use the same email/password. No per-user features, no magic
links, no invites. RLS policies use `auth.uid() = user_id` to scope data to
that one account.

### getSession() not getUser()
`getSession()` reads the auth cookie synchronously. `getUser()` makes a network
call to Supabase that can time out. This applied to the web app middleware and
should be kept in mind for any server-side auth calls.

---

## Retired Web App Decisions
_(Historical record only — Next.js PWA retired. Do not apply these to the iOS app.)_

### Frontend Architecture
- All Trips page was a client component for tab-switch performance
- Timestamps formatted client-side only due to Vercel running in UTC vs CEST
- No explicit `<head>` tag in layout.js — caused hydration mismatches

### GPS Tracking (web)
- COG/SOG derived from geometry via `enrichPoints()` — iOS Safari returned
  null for `coords.speed` and `coords.heading`
- 30-second throttle on track points
- Wake Lock API (`navigator.wakeLock`) to keep GPS running
- Pending GPS points persisted to `localStorage` keyed by leg ID
- TripContext + localStorage for cross-tab state

### Maps (web)
- OpenStreetMap + OpenSeaMap tile layers (no API keys required)
- Leaflet imported sequentially, not with Promise.all — plugin race condition
- Two-finger pan via leaflet-gesture-handling

### PWA
- Service worker cache version auto-bumped on build via prebuild script
- Cache-first for static assets, network-first for navigation requests

### UI Details (web)
- Event button grid: 3 columns × 2 rows, column-first order
- Stop button uses `■` not `⏹` (emoji rendering issue on iOS)
- Pencil icon outside Link on trip cards (no button inside anchor)
- Back button on leg detail respects `?from=tripId` query param
- LEG_COLORS exported from TripOverviewMap.js and imported in TripDetailView.js

---

## Version Tags

### iOS App
| Tag | Contents |
|-----|----------|
| `v1.0-ios-foundation` | Initial iOS app — NMEA recording, live display, Supabase logging |

### Web App (retired)
| Tag | Contents |
|-----|----------|
| `v1.0-secure` | RLS + middleware auth hardening |
| `v1.1-three-tabs` | 3-tab redesign |
| `v1.2-with-position` | Position display + bug fixes |
| `v1.3-pwa-engine` | PWA, Engine On/Off, tab speed |
| `v1.4-refactor` | GPS logic extracted into `useGpsTracking` hook |
| `v1.5-pre-legs-refactor` | Snapshot before trips/legs hierarchy refactor |
| `v1.6-trips-legs-ui` | Trips/legs hierarchy, soft delete, More tab, events on tracking tab, trip overview map |