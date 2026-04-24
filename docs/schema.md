# docs/schema.md — Database Schema

_Last updated: 24 April 2026. Update this file whenever columns or RLS policies change._

---

## Tables

### `legs`
One row per continuous GPS-tracked sail (start → stop).

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK, default `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL | FK → `auth.users.id` |
| `started_at` | timestamptz | NOT NULL | Set on leg start |
| `ended_at` | timestamptz | NULL | Set on leg stop; NULL means in progress |
| `duration_seconds` | integer | NULL | Wall-clock seconds from start to stop |
| `distance_nm` | double precision | NULL | Total nautical miles tracked |
| `last_lat` | double precision | NULL | Updated on each GPS batch upload |
| `last_lng` | double precision | NULL | Updated on each GPS batch upload |
| `deleted_at` | timestamptz | NULL | Soft delete — non-NULL means deleted |
| `created_at` | timestamptz | NOT NULL | Default `now()` |

**RLS policies:**
- `SELECT` — `auth.uid() = user_id`
- `INSERT` — no row-level check (any authenticated user can insert)
- `UPDATE` — `auth.uid() = user_id`
- `DELETE` — `auth.uid() = user_id`

**Gotchas:**
- Always filter `.is('deleted_at', null)` in all normal queries. The More tab is the only place that deliberately queries deleted legs.
- `ended_at IS NULL` means the leg is currently recording.

---

### `trips`
Named containers grouping legs by date range.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK, default `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL | FK → `auth.users.id` |
| `name` | text | NOT NULL | User-defined trip name |
| `start_date` | date | NOT NULL | Inclusive start of the date range |
| `end_date` | date | NOT NULL | Inclusive end of the date range |
| `created_at` | timestamptz | NOT NULL | Default `now()` |

**RLS policies:**
- `SELECT` — `auth.uid() = user_id`
- `INSERT` — no row-level check
- `UPDATE` — `auth.uid() = user_id`
- `DELETE` — `auth.uid() = user_id`

**Gotchas:**
- A leg belongs to a trip if `leg.started_at::date` falls within `[trip.start_date, trip.end_date]`. This comparison currently runs client-side — see CLAUDE.md for the known fragility.
- A trip is auto-deleted when its last leg is soft-deleted.

---

### `track_points`
Individual GPS fixes recorded during a leg.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK, default `gen_random_uuid()` |
| `trip_id` | uuid | NOT NULL | FK → `legs.id` (named `trip_id` for historical reasons) |
| `recorded_at` | timestamptz | NOT NULL | UTC time of the GPS fix |
| `lat` | **numeric** | NOT NULL | ⚠ See gotcha below |
| `lng` | **numeric** | NOT NULL | ⚠ See gotcha below |
| `speed` | numeric | NULL | Knots — derived from position delta, not GPS hardware |
| `course` | numeric | NULL | Degrees 0–360 — derived from bearing, not GPS hardware |
| `created_at` | timestamptz | NOT NULL | Default `now()` |

**RLS policies:**
- `SELECT` — `trip_id IN (SELECT id FROM legs WHERE user_id = auth.uid())`
- `INSERT` — no row-level check
- `DELETE` — `trip_id IN (SELECT id FROM legs WHERE user_id = auth.uid())`

**Gotchas:**
- `lat` and `lng` are `numeric` (arbitrary precision), **not** `double precision`. JavaScript arithmetic on `numeric` values returned via PostgREST will silently produce `NaN` or string concatenation. Always call `parseFloat(pt.lat)` and `parseFloat(pt.lng)` before any math.
- GPS hardware on iOS returns `null` for `speed` and `heading`. Both columns are populated by `enrichPoints()` (geometry-derived), not from `coords.speed` / `coords.heading`.
- Points are recorded at most once every 30 seconds and uploaded in batches. The `created_at` ≠ `recorded_at` — always sort by `recorded_at`.

---

### `logbook_entries`
Events and comments logged during a leg.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK, default `gen_random_uuid()` |
| `trip_id` | uuid | NOT NULL | FK → `legs.id` |
| `recorded_at` | timestamptz | NOT NULL | Time the event occurred |
| `event_type` | text | NOT NULL | See allowed values below |
| `comment` | text | NULL | Only populated when `event_type = 'comment'` |
| `lat` | double precision | NULL | Position at time of event |
| `lng` | double precision | NULL | Position at time of event |
| `created_at` | timestamptz | NOT NULL | Default `now()` |

**Allowed `event_type` values** (lowercase, exact):
`tack` · `jibe` · `reef` · `unreef` · `engine on` · `engine off` · `comment`

**RLS policies:**
- `SELECT` — `trip_id IN (SELECT id FROM legs WHERE user_id = auth.uid())`
- `INSERT` — no row-level check
- `DELETE` — `trip_id IN (SELECT id FROM legs WHERE user_id = auth.uid())`

---

### `trip_notes`
Free-text notes attached to a leg (shown at the top of the leg detail page).

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK, default `gen_random_uuid()` |
| `trip_id` | uuid | NOT NULL | FK → `legs.id` (named `trip_id` for historical reasons — do not rename without a migration) |
| `content` | text | NOT NULL | Note body |
| `created_at` | timestamptz | NOT NULL | Default `now()` |

**RLS policies:**
- `SELECT` — `trip_id IN (SELECT id FROM legs WHERE user_id = auth.uid())`
- `INSERT` — no row-level check
- `DELETE` — `trip_id IN (SELECT id FROM legs WHERE user_id = auth.uid())`

---

## Relationship diagram

```
auth.users
    │
    ├── legs (user_id)
    │       │
    │       ├── track_points (trip_id → legs.id)
    │       ├── logbook_entries (trip_id → legs.id)
    │       └── trip_notes (trip_id → legs.id)
    │
    └── trips (user_id)   — date-range grouping only, no FK to legs
```

`trips` has no foreign key to `legs`. The relationship is purely logical: a leg belongs to a trip if its `started_at` date falls within the trip's `[start_date, end_date]` range.

---

## Common query patterns

```js
// All active (non-deleted) legs
supabase.from('legs').select('*').is('deleted_at', null)

// Legs belonging to a named trip
supabase.from('legs')
  .select('...')
  .gte('started_at', trip.start_date)
  .lte('started_at', trip.end_date + 'T23:59:59.999Z')
  .is('deleted_at', null)

// Track points for a leg — always parseFloat lat/lng
const { data } = await supabase.from('track_points')
  .select('lat, lng, recorded_at')
  .eq('trip_id', legId)
  .order('recorded_at')
const points = data.map(p => ({ ...p, lat: parseFloat(p.lat), lng: parseFloat(p.lng) }))

// Soft delete a leg
supabase.from('legs').update({ deleted_at: new Date().toISOString() }).eq('id', id)

// Restore a soft-deleted leg
supabase.from('legs').update({ deleted_at: null }).eq('id', id)
```
