import Foundation
import Combine
import SwiftUI

@MainActor
final class AppState: ObservableObject {

    // MARK: - Auth
    @Published var isAuthenticated = false

    // MARK: - Active leg
    @Published var activeLegID: UUID?
    @Published var legStartTime: Date?

    var isTracking: Bool { activeLegID != nil }

    // MARK: - Vessel state (live NMEA data)
    @Published var vesselState = VesselState()

    // MARK: - Connection status
    @Published var zeusConnectionState: ZeusConnectionState = .disconnected
    @Published var positionSource: PositionSource = .phoneGPS
    @Published var syncStatus: SyncStatus = .idle

    // MARK: - Settings (persisted via UserDefaults)
    @AppStorage("zeusHost")        var zeusHost: String = Config.defaultZeusHost
    @AppStorage("zeusPort")        var zeusPortRaw: Int = Int(Config.defaultZeusPort)
    @AppStorage("simulatorMode")   var simulatorMode: Bool = false
    @AppStorage("developerMode")   var developerMode: Bool = false

    var zeusPort: UInt16 { UInt16(zeusPortRaw) }

    // MARK: - NMEA sentence log (for Developer Mode)
    @Published private(set) var nmealog: [NMEALogEntry] = []
    private let maxLogEntries = 500

    func appendLog(_ sentence: String) {
        let entry = NMEALogEntry(sentence: sentence, timestamp: Date())
        nmealog.append(entry)
        if nmealog.count > maxLogEntries {
            nmealog.removeFirst(nmealog.count - maxLogEntries)
        }
    }

    func clearLog() { nmealog.removeAll() }
}

// MARK: - Supporting types

enum ZeusConnectionState {
    case disconnected
    case connecting
    case connected
    case failed(String)

    var label: String {
        switch self {
        case .disconnected:    return "Disconnected"
        case .connecting:      return "Connecting…"
        case .connected:       return "Zeus3 Connected"
        case .failed(let msg): return "Error: \(msg)"
        }
    }

    var isConnected: Bool {
        if case .connected = self { return true }
        return false
    }
}

enum PositionSource {
    case zeus3
    case phoneGPS

    var label: String {
        switch self {
        case .zeus3:    return "Zeus3"
        case .phoneGPS: return "Phone GPS"
        }
    }
}

enum SyncStatus {
    case idle
    case syncing
    case buffering
    case syncError(String)

    var label: String {
        switch self {
        case .idle:               return "Idle"
        case .syncing:            return "Live to Supabase"
        case .buffering:          return "Buffering offline"
        case .syncError(let msg): return "Sync error: \(msg)"
        }
    }
}

struct NMEALogEntry: Identifiable {
    let id = UUID()
    let sentence: String
    let timestamp: Date
}
