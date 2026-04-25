import Foundation
import Network

@MainActor
final class NMEATCPClient: ObservableObject {

    private weak var appState: AppState?
    private var connection: NWConnection?
    private var reconnectTask: Task<Void, Never>?
    private var receiveBuffer = Data()
    private var lastValidPositionDate: Date?

    private let queue = DispatchQueue(label: "nmea.tcp", qos: .userInitiated)

    init(appState: AppState) {
        self.appState = appState
    }

    // MARK: - Public interface

    func start() {
        reconnectTask?.cancel()
        connect()
    }

    func stop() {
        reconnectTask?.cancel()
        reconnectTask = nil
        connection?.cancel()
        connection = nil
        appState?.zeusConnectionState = .disconnected
    }

    // MARK: - Connection lifecycle

    private func connect() {
        guard let appState else { return }
        let host: NWEndpoint.Host
        let port: NWEndpoint.Port
        if appState.simulatorMode {
            host = NWEndpoint.Host(Config.simulatorHost)
            port = NWEndpoint.Port(rawValue: Config.simulatorPort)!
        } else {
            host = NWEndpoint.Host(appState.zeusHost)
            port = NWEndpoint.Port(rawValue: appState.zeusPort)!
        }

        appState.zeusConnectionState = .connecting
        receiveBuffer.removeAll()

        let params = NWParameters.tcp
        params.requiredInterfaceType = appState.simulatorMode ? .loopback : .wifi
        let conn = NWConnection(host: host, port: port, using: params)
        connection = conn

        conn.stateUpdateHandler = { [weak self] state in
            Task { @MainActor [weak self] in self?.handleState(state) }
        }
        conn.start(queue: queue)
        receive(on: conn)
    }

    private func handleState(_ state: NWConnection.State) {
        switch state {
        case .ready:
            appState?.zeusConnectionState = .connected
        case .failed(let err):
            appState?.zeusConnectionState = .failed(err.localizedDescription)
            scheduleReconnect()
        case .cancelled:
            break
        case .waiting:
            appState?.zeusConnectionState = .connecting
        default:
            break
        }
    }

    private func scheduleReconnect() {
        reconnectTask = Task {
            try? await Task.sleep(nanoseconds: 3_000_000_000) // 3s
            guard !Task.isCancelled else { return }
            await MainActor.run { self.connect() }
        }
    }

    // MARK: - Receive loop

    private func receive(on conn: NWConnection) {
        conn.receive(minimumIncompleteLength: 1, maximumLength: 4096) { [weak self] data, _, isComplete, error in
            if let data {
                Task { @MainActor [weak self] in self?.process(data) }
            }
            if error == nil && !isComplete {
                self?.receive(on: conn)
            }
        }
    }

    private func process(_ data: Data) {
        receiveBuffer.append(data)
        while let newline = receiveBuffer.firstIndex(of: UInt8(ascii: "\n")) {
            let lineData = receiveBuffer[receiveBuffer.startIndex...newline]
            receiveBuffer.removeSubrange(receiveBuffer.startIndex...newline)
            if let sentence = String(data: lineData, encoding: .ascii)?
                .trimmingCharacters(in: .whitespacesAndNewlines),
               sentence.hasPrefix("$") {
                handleSentence(sentence)
            }
        }
        // Guard against unbounded buffer growth (e.g. no newlines from bad data)
        if receiveBuffer.count > 8192 { receiveBuffer.removeAll() }
    }

    private func handleSentence(_ sentence: String) {
        guard let appState else { return }
        if appState.developerMode { appState.appendLog(sentence) }

        var newState = appState.vesselState
        let hadPosition = newState.lat != nil

        NMEAParserRegistry.parse(sentence, into: &newState)

        // Track whether Zeus3 is providing fresh position data
        if newState.lat != nil {
            lastValidPositionDate = Date()
            if appState.positionSource != .zeus3 {
                appState.positionSource = .zeus3
            }
        }

        appState.vesselState = newState
    }

    // Called periodically by LocationManager to check if fallback should activate
    func checkPositionFallback() {
        guard let last = lastValidPositionDate else {
            // Never received a position from Zeus3 — stay on phone GPS
            return
        }
        let stale = Date().timeIntervalSince(last) > Config.gpsFallbackSeconds
        if stale && appState?.positionSource == .zeus3 {
            appState?.positionSource = .phoneGPS
        }
    }
}
