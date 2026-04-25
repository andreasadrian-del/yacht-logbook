# docs/architecture.md — iOS App Architecture

_Last updated: 25 April 2026. Update this file whenever the structure changes meaningfully._

---

## Folder structure

```
YachtLogbookiOS/
├── YachtLogbook.xcodeproj/         # Xcode project (open to set Team ID)
│   ├── project.pbxproj
│   └── project.xcworkspace/
│
└── YachtLogbook/
    ├── App/
    │   ├── YachtLogbookApp.swift   # @main entry, SwiftData container, root router
    │   ├── AppState.swift          # @MainActor ObservableObject — all global state
    │   └── Config.swift            # Supabase URL/key, Zeus3 defaults, GPS timeout
    │
    ├── NMEA/
    │   ├── NMEASentenceParser.swift  # Protocol + NMEA helpers (checksum, coord, fields)
    │   ├── NMEAParserRegistry.swift  # Central registry — add a sentence type = 1 line here
    │   ├── VesselState.swift         # All parsed NMEA values in one struct
    │   └── Parsers/                  # One struct per sentence type
    │       ├── GPRMCParser.swift     # Position, SOG, COG
    │       ├── GPGGAParser.swift     # Position fallback
    │       ├── IIMWVParser.swift     # Apparent/true wind speed + angle (R/T)
    │       ├── IIMWDParser.swift     # True wind direction (absolute compass)
    │       ├── IIDBTParser.swift     # Depth below transducer
    │       ├── IIDPTParser.swift     # Depth (alternate)
    │       ├── IIVHWParser.swift     # Speed through water
    │       ├── IIMTWParser.swift     # Water temperature
    │       ├── IIHDGParser.swift     # Magnetic heading
    │       ├── IIHDTParser.swift     # True heading
    │       └── IIXDRParser.swift     # Heel angle (verify field layout on first on-boat test)
    │
    ├── Networking/
    │   ├── NMEATCPClient.swift       # NWConnection, WiFi interface, auto-reconnect, GPS fallback timer
    │   ├── ConnectivityMonitor.swift # NWPathMonitor — internet detection (cellular only)
    │   └── NMEASimulator.swift       # NWListener on 127.0.0.1:10110, 1Hz NMEA emission
    │
    ├── Location/
    │   └── LocationManager.swift     # CoreLocation, background updates, phone GPS fallback
    │
    ├── Data/
    │   ├── Models/                   # SwiftData @Model classes (iOS 17+)
    │   │   ├── LegModel.swift
    │   │   ├── TripModel.swift
    │   │   ├── TrackPointModel.swift  # Captures full VesselState snapshot
    │   │   ├── LogbookEntryModel.swift
    │   │   ├── TripNoteModel.swift
    │   │   └── BufferedUploadModel.swift  # Generic offline buffer (JSON payloads)
    │   └── SupabaseService.swift     # All Supabase I/O; one-line extension point for new fields
    │
    ├── Views/
    │   ├── Tracking/
    │   │   ├── TrackingView.swift    # 12-instrument grid, status pills, event buttons, slider
    │   │   └── InstrumentCard.swift  # InstrumentCard, StatusPill, TrackSlider components
    │   ├── Trips/
    │   │   ├── TripsView.swift       # Trip list, grouping, create/edit sheets
    │   │   ├── TripCardView.swift    # Collapsible trip card with leg rows
    │   │   └── LegRowView.swift      # Swipe-to-delete leg row
    │   ├── LegDetail/
    │   │   ├── LegDetailView.swift   # Map, stats, notes, event log
    │   │   └── LegMapView.swift      # MapKit polyline with start/end markers
    │   ├── Archive/
    │   │   └── ArchiveView.swift     # Deleted legs, restore, hard delete
    │   ├── Auth/
    │   │   └── LoginView.swift       # Email/password login
    │   └── Settings/
    │       ├── SettingsView.swift    # Zeus3 IP/port, simulator toggle, status, dev mode
    │       └── DeveloperMode/
    │           ├── DeveloperModeView.swift    # VesselState dump, $IIXDR stream, nav links
    │           ├── NMEALogView.swift          # Scrolling sentence log, filter, pause, color-coded
    │           └── OnBoatChecklistView.swift  # 13-item pass/fail checklist (UserDefaults)
    │
    └── Resources/
        ├── Info.plist              # Background location mode, display name
        ├── Assets.xcassets/        # App icon placeholder
        └── YachtLogbook.entitlements  # Network client/server, WiFi info
```

---

## Data flow

### NMEA reception

```
Zeus3 WiFi (192.168.1.1:10110)  OR  NMEASimulator (127.0.0.1:10110)
    │ raw TCP stream
    ▼
NMEATCPClient (NWConnection, wifi interface)
    ├── buffers bytes until \n, extracts complete sentences
    ├── validates checksum via NMEA.checksumValid()
    ├── NMEAParserRegistry.parse() → updates VesselState
    ├── tracks lastValidPositionDate → triggers GPS fallback after 5s
    └── auto-reconnects after 3s on connection drop

AppState.vesselState (published) → TrackingView re-renders on every update
```

### Position source priority

```
Zeus3 active + valid $GPRMC → positionSource = .zeus3
    │ if no valid position for 5s
    ▼
LocationManager (CoreLocation) → positionSource = .phoneGPS
    │ writes lat/lon/SOG/COG into vesselState only when source = .phoneGPS
    │ when Zeus3 recovers → NMEATCPClient sets positionSource = .zeus3
    └── every track point includes data_source = "zeus3" | "phone_gps"
```

### Offline buffering

```
ConnectivityMonitor (NWPathMonitor, cellular)
    │ hasInternet published
    ▼
SupabaseService
    ├── hasInternet = true  → insert directly to Supabase
    ├── hasInternet = false → insert into BufferedUploadModel (SwiftData)
    └── on reconnect → flushBuffer() uploads in order, deletes on success
```

### Background operation

```
Location Updates background mode (Info.plist UIBackgroundModes = location)
    │ keeps process alive when screen locks
    ▼
NMEATCPClient continues receiving NMEA data
LocationManager continues sending CoreLocation updates
SupabaseService continues uploading (if cellular available)
```

---

## Key design rules

### NMEA extensibility
Adding a new sentence type requires only:
1. New struct conforming to `NMEASentenceParser` in `NMEA/Parsers/`
2. One line in `NMEAParserRegistry.parsers`
3. New property in `VesselState`

No other file changes.

### Supabase field extensibility
Adding a new NMEA field to the database requires:
1. New property on `TrackPointModel`
2. One line in `SupabaseService.trackPointPayload()`
3. Supabase migration (see schema.md)

### Data source clarity
Every `track_points` row written by the iOS app has `data_source = "zeus3"` or `"phone_gps"`.
Rows written by the retired web app have `data_source = NULL`.

---

## First-time Xcode setup

1. Open `YachtLogbookiOS/YachtLogbook.xcodeproj` in Xcode
2. Select the YachtLogbook target → Signing & Capabilities → set your Team
3. Fill in `Config.swift` — replace `YOUR_PROJECT_REF` and `YOUR_ANON_KEY`
4. Run on device (simulator has no GPS hardware)
5. Enable Simulator Mode in Settings to test NMEA flow without Zeus3

---

## Supabase migration required

Before the iOS app can write NMEA data, run the migration in `docs/schema.md`.
New columns are all nullable — existing web-app rows are unaffected.
