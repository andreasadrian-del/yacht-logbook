# docs/architecture.md — Application Architecture

_Last updated: 24 April 2026. Update this file whenever the structure changes meaningfully._

---

## Folder structure

```
yacht-logbook/
├── app/                        # Next.js App Router — all routes and UI
│   ├── layout.js               # Root layout: wraps every page in TripProvider + PWAInit
│   ├── page.js                 # / — Tracking tab (client component)
│   ├── globals.css
│   ├── BottomNav.js            # Shared bottom tab bar (client component)
│   ├── LiveMap.js              # Leaflet map shown during active tracking (client component)
│   ├── WayLogIcon.js           # App logo SVG component
│   ├── TripContext.js          # Global tracking state via React Context + localStorage
│   ├── PWAInit.js              # Registers the service worker on first render
│   ├── useGpsTracking.js       # Custom hook: all GPS, upload, wake lock, offline queue logic
│   │
│   ├── trips/
│   │   ├── page.js             # /trips — All Trips tab (client component; intentional)
│   │   ├── TripsList.js        # Trip cards, leg rows, modals (client component — 472 lines, refactor target)
│   │   └── [id]/
│   │       ├── page.js         # /trips/:id — Trip detail (server component)
│   │       ├── TripDetailView.js  # Summary + leg list UI (client component)
│   │       └── TripOverviewMap.js # Leaflet map with coloured leg polylines (client component)
│   │
│   ├── legs/
│   │   └── [id]/
│   │       ├── page.js         # /legs/:id — Leg detail (server component)
│   │       ├── LegDetailView.js   # Notes, timeline, map (client component)
│   │       ├── LegMap.js       # Leaflet map for a completed leg (client component)
│   │       └── LegLiveUpdater.js  # Supabase real-time subscription for in-progress legs (client component)
│   │
│   ├── more/
│   │   └── page.js             # /more — Deleted legs archive (client component)
│   │
│   ├── login/
│   │   └── page.js             # /login — Email/password login form
│   │
│   └── log/
│       └── page.js             # DEAD FILE — Log Entry tab was removed. Delete before working nearby.
│
├── lib/
│   ├── supabase.js             # Browser Supabase client (singleton, used in client components)
│   └── supabase-server.js      # Server Supabase client factory (used in server components + middleware)
│
├── middleware.js               # Auth guard — redirects to /login if no session
│
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker
│   └── icons/                  # PWA icons (192, 512, apple-touch)
│
└── docs/                       # Architecture, schema, and decision docs
```

---

## Server vs client components

Every component is either a **server component** (runs on Vercel at request time, can call Supabase directly, never ships to the browser) or a **client component** (`'use client'` at the top, runs in the browser, handles interactivity and browser APIs).

| File | Type | Reason |
|---|---|---|
| `app/layout.js` | Server | Root layout — no interactivity |
| `app/page.js` | **Client** | GPS, Geolocation API, Wake Lock, maps |
| `app/trips/page.js` | **Client** | Real-time subscription + fast tab-switch (see decisions.md) |
| `app/trips/[id]/page.js` | Server | Fetches trip + legs + track points, computes nothing interactive |
| `app/trips/[id]/TripDetailView.js` | **Client** | Renders the map (Leaflet = browser-only) |
| `app/trips/[id]/TripOverviewMap.js` | **Client** | Leaflet, dynamic import |
| `app/legs/[id]/page.js` | Server | Fetches all leg data, runs `enrichPoints()` + `generateTimeline()` |
| `app/legs/[id]/LegDetailView.js` | **Client** | Notes input, comment modal, Leaflet map |
| `app/legs/[id]/LegMap.js` | **Client** | Leaflet |
| `app/legs/[id]/LegLiveUpdater.js` | **Client** | Supabase real-time subscription, calls `router.refresh()` |
| `app/more/page.js` | **Client** | Swipe gestures, restore/delete interactions |
| `app/login/page.js` | **Client** | Form state |
| `app/BottomNav.js` | **Client** | `usePathname()` requires browser |
| `app/TripContext.js` | **Client** | `localStorage`, React state |
| `app/PWAInit.js` | **Client** | `navigator.serviceWorker` |
| `app/useGpsTracking.js` | **Client** | `navigator.geolocation`, `navigator.wakeLock` |
| `middleware.js` | Edge (server) | Runs before every request |

---

## Data flow

### Tracking tab (`/`)

```
GPS hardware
    │ navigator.geolocation.watchPosition()
    ▼
useGpsTracking hook (client)
    ├── batches points in pendingPointsRef (also mirrored to localStorage)
    ├── uploads batch every 30s → supabase: track_points INSERT
    ├── updates last_lat/last_lng → supabase: legs UPDATE
    └── on stopLeg → supabase: legs UPDATE (ended_at, duration_seconds, distance_nm)

TripContext (client, global)
    ├── stores active legId + start time in localStorage
    └── provides isTracking / tripId to all components via React context

app/page.js (client)
    ├── reads TripContext for tracking state
    ├── calls useGpsTracking for position + elapsed + distance
    ├── renders LiveMap (Leaflet, browser only)
    └── on event button press → supabase: logbook_entries INSERT
```

### All Trips tab (`/trips`)

```
app/trips/page.js (client component — fetch on mount)
    │ supabase.from('trips') + supabase.from('legs') — parallel fetch
    │ + Supabase real-time subscription on both tables
    ▼
TripsList.js (client component)
    ├── groups legs into named trips by date range (client-side — fragile, see CLAUDE.md)
    ├── renders collapsible TripCard rows
    ├── pencil → EditTripModal → supabase: trips UPDATE
    ├── create → CreateTripModal → supabase: trips INSERT
    └── delete leg → supabase: legs UPDATE (deleted_at) → if last leg, trips DELETE
```

### Trip detail (`/trips/:id`)

```
app/trips/[id]/page.js (server component)
    │ supabase: trips SELECT (single) + legs SELECT (date range) + track_points SELECT (all leg IDs)
    │ groups track_points into pointsByLeg map
    ▼
TripDetailView.js (client component)
    ├── renders summary stats (dates, leg count, total NM, total time)
    ├── passes pointsByLeg → TripOverviewMap (Leaflet, dynamic import)
    └── renders legs list — each row links to /legs/:id?from=tripId
```

### Leg detail (`/legs/:id`)

```
app/legs/[id]/page.js (server component)
    │ supabase: legs + track_points + logbook_entries + trip_notes — all parallel
    │ enrichPoints(): derives calcCog/calcSog from consecutive track point geometry
    │ generateTimeline(): builds 5-min interval rows with nearest GPS point + events
    ▼
LegDetailView.js (client component)
    ├── notes textarea → supabase: trip_notes INSERT (browser client)
    ├── renders timeline table (ISO timestamps formatted in browser for correct timezone)
    └── passes points → LegMap (Leaflet, dynamic import)

LegLiveUpdater.js (client component, rendered only when leg.ended_at is null)
    └── Supabase real-time: track_points + logbook_entries INSERT
        → router.refresh() → Next.js re-runs the server component → fresh data
```

### More tab (`/more`)

```
app/more/page.js (client component — fetch on mount)
    │ supabase.from('legs').not('deleted_at', 'is', null)
    ▼
DeletedLegRow
    ├── swipe right → supabase: legs UPDATE (deleted_at = null)  [restore]
    └── swipe left → confirm modal → supabase: track_points DELETE
                                              logbook_entries DELETE
                                              trip_notes DELETE
                                              legs DELETE         [hard delete]
```

---

## Auth and middleware

Every request passes through `middleware.js` before reaching any route:

```
Incoming request
    │
    ▼
middleware.js
    ├── /login → pass through
    ├── /_next/static, /favicon.ico, *.svg → pass through (matcher excludes these)
    └── everything else:
            supabase.auth.getSession()   ← reads cookie, no network call
            session present → NextResponse.next()
            no session     → redirect to /login
```

`getSession()` is used (not `getUser()`) because it reads the auth cookie synchronously — `getUser()` makes a network round-trip to Supabase that can time out and let unauthenticated requests through.

Two Supabase clients exist for a reason:
- `lib/supabase.js` — browser singleton, used in all `'use client'` components
- `lib/supabase-server.js` — server factory function, creates a new client per request with the correct cookie context, used in server components and middleware

---

## Global state: TripContext

`TripContext.js` is the only piece of global state. It solves the problem that navigating between tabs unmounts and remounts the Tracking page, which would otherwise lose the active leg ID and elapsed timer.

```
TripProvider (wraps entire app in layout.js)
    │
    ├── tripId          — active leg UUID (null if not tracking)
    ├── isTracking      — boolean (null during hydration to avoid flicker)
    ├── tripStartTime   — epoch ms (for elapsed timer)
    └── currentPosition — latest lat/lng (shared with event logging)

    All persisted in localStorage so state survives:
    - tab switches (component unmount/remount)
    - page refresh
    - app backgrounding on iOS
```

---

## PWA and service worker

```
User adds app to Home Screen
    │
    ▼
manifest.json
    ├── display: "standalone"  — full-screen, no browser chrome
    ├── start_url: "/"
    └── theme_color: #1a3a6b

PWAInit.js (client component, rendered in layout.js)
    └── navigator.serviceWorker.register('/sw.js')  — runs once on first render

sw.js — two caching strategies:
    ├── /_next/static/** — cache-first
    │       Content-hashed filenames → safe to cache forever
    │       First hit: fetch + store. Subsequent: serve from cache immediately.
    │
    └── navigation requests (request.mode === 'navigate') — network-first
            Online: fetch fresh, store in cache for offline fallback
            Offline: serve cached version of the page
            Supabase + external requests: pass through (not cached)

Cache invalidation:
    package.json prebuild script replaces the CACHE name in sw.js with a
    timestamp before every `next build`. New cache name → old caches deleted
    on SW activate → users always get fresh assets after deploy.
```

**Wake Lock** is handled separately inside `useGpsTracking` (not the service worker). `navigator.wakeLock.request('screen')` keeps the iOS screen on during tracking so the GPS watch is not suspended. It is re-acquired on every `visibilitychange` event (screen unlock).

---

## Current architectural debt

| Issue | Location | Risk |
|---|---|---|
| Supabase called directly from components and pages | Most files | Hard to test; mixed concerns |
| Trip-to-leg grouping runs client-side | `TripsList.js` | Wrong results at date boundaries |
| `TripsList.js` is 472 lines, does fetching + state + rendering | `app/trips/TripsList.js` | Hard to change safely |
| Dead file | `app/log/page.js` | Confusion; delete before working nearby |
| No `/lib/db/` abstraction layer | — | All queries are inline; no single place to add error handling or tests |

See `CLAUDE.md` for the agreed direction on resolving each of these.
