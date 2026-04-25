import Foundation
import Network

// Local TCP server that emits realistic NMEA 0183 sentences every second.
// The app connects to 127.0.0.1:10110 exactly as it would the real Zeus3.
// Scenario: beating upwind in German Bight (54°N, 8°E), 15kts breeze.
@MainActor
final class NMEASimulator: ObservableObject {

    private var listener: NWListener?
    private var clientConnections: [NWConnection] = []
    private var emitTask: Task<Void, Never>?
    private let queue = DispatchQueue(label: "nmea.simulator", qos: .utility)

    // Mutable state for realistic motion
    private var lat = 54.0
    private var lon = 8.0
    private var cog = 45.0        // beating upwind NE
    private var tick = 0

    @Published private(set) var isRunning = false

    func start() {
        guard !isRunning else { return }
        let port = NWEndpoint.Port(rawValue: Config.simulatorPort)!
        let params = NWParameters.tcp
        params.requiredLocalEndpoint = NWEndpoint.hostPort(host: "127.0.0.1", port: port)

        do {
            listener = try NWListener(using: params)
        } catch {
            return
        }

        listener?.newConnectionHandler = { [weak self] conn in
            conn.start(queue: self?.queue ?? .main)
            Task { @MainActor [weak self] in self?.clientConnections.append(conn) }
        }
        listener?.start(queue: queue)
        isRunning = true
        startEmitting()
    }

    func stop() {
        emitTask?.cancel()
        emitTask = nil
        clientConnections.forEach { $0.cancel() }
        clientConnections.removeAll()
        listener?.cancel()
        listener = nil
        isRunning = false
    }

    // MARK: - Emission loop

    private func startEmitting() {
        emitTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                guard !Task.isCancelled else { break }
                await MainActor.run { self.emitCycle() }
            }
        }
    }

    private func emitCycle() {
        tick += 1

        // Realistic noise
        let rnd = { Double.random(in: -1...1) }
        let sogBase = 5.0 + rnd() * 0.3
        cog = 45.0 + sin(Double(tick) * 0.05) * 10.0 + rnd() * 0.5
        let headingMag = cog + 5.0 + rnd() * 0.5

        // Advance position (very slowly)
        lat += sogBase * cos(cog * .pi / 180) / 3600 / 60
        lon += sogBase * sin(cog * .pi / 180) / (3600 * 60 * cos(lat * .pi / 180))

        let timeStr = utcTimeString()
        let dateStr = utcDateString()
        let latNMEA = degreesToNMEA(lat, isLat: true)
        let lonNMEA = degreesToNMEA(lon, isLat: false)

        var sentences: [String] = []

        // GPRMC
        let rmc = "GPRMC,\(timeStr),A,\(latNMEA.val),\(latNMEA.dir),\(lonNMEA.val),\(lonNMEA.dir),\(fmt1(sogBase)),\(fmt1(cog)),\(dateStr),,"
        sentences.append("$\(rmc)*\(checksum(rmc))")

        // IIMWV apparent
        let awa = 40.0 + rnd() * 2
        let aws = 18.0 + rnd() * 0.5
        let mwvR = "IIMWV,\(fmt1(awa)),R,\(fmt1(aws)),N,A"
        sentences.append("$\(mwvR)*\(checksum(mwvR))")

        // IIMWV true
        let twa = 60.0 + rnd() * 2
        let tws = 15.0 + rnd() * 0.5
        let mwvT = "IIMWV,\(fmt1(twa)),T,\(fmt1(tws)),N,A"
        sentences.append("$\(mwvT)*\(checksum(mwvT))")

        // IIMWD
        let twd = (cog + twa).truncatingRemainder(dividingBy: 360)
        let mwd = "IIMWD,\(fmt1(twd)),T,,M,\(fmt1(tws)),N,,"
        sentences.append("$\(mwd)*\(checksum(mwd))")

        // IIDBT
        let depth = 22.0 + rnd() * 0.8
        let dbt = "IIDBT,,f,\(fmt1(depth)),M,,F"
        sentences.append("$\(dbt)*\(checksum(dbt))")

        // IIVHW
        let stw = 4.8 + rnd() * 0.2
        let vhw = "IIVHW,,T,,M,\(fmt1(stw)),N,,"
        sentences.append("$\(vhw)*\(checksum(vhw))")

        // IIMTW
        let wt = 14.0 + rnd() * 0.2
        let mtw = "IIMTW,\(fmt1(wt)),C"
        sentences.append("$\(mtw)*\(checksum(mtw))")

        // IIHDG
        let hdg = "IIHDG,\(fmt1(headingMag)),,,,"
        sentences.append("$\(hdg)*\(checksum(hdg))")

        // IIXDR heel
        let heel = 18.0 + rnd() * 1.5
        let xdr = "IIXDR,A,\(fmt1(heel)),D,HEEL"
        sentences.append("$\(xdr)*\(checksum(xdr))")

        let payload = (sentences.joined(separator: "\r\n") + "\r\n")
            .data(using: .ascii) ?? Data()

        // Prune dead connections and send
        clientConnections = clientConnections.filter { conn in
            if case .cancelled = conn.state { return false }
            if case .failed = conn.state { return false }
            return true
        }
        clientConnections.forEach { conn in
            conn.send(content: payload, completion: .idempotent)
        }
    }

    // MARK: - Helpers

    private func checksum(_ body: String) -> String {
        let xor = body.unicodeScalars.reduce(UInt8(0)) { $0 ^ UInt8($1.value & 0xFF) }
        return String(format: "%02X", xor)
    }

    private func fmt1(_ v: Double) -> String { String(format: "%.1f", v) }

    private func utcTimeString() -> String {
        let c = Calendar(identifier: .gregorian).dateComponents(in: .gmt, from: Date())
        return String(format: "%02d%02d%02d.00", c.hour!, c.minute!, c.second!)
    }

    private func utcDateString() -> String {
        let c = Calendar(identifier: .gregorian).dateComponents(in: .gmt, from: Date())
        return String(format: "%02d%02d%02d", c.day!, c.month!, (c.year! % 100))
    }

    private func degreesToNMEA(_ decimal: Double, isLat: Bool) -> (val: String, dir: String) {
        let abs = Swift.abs(decimal)
        let deg = Int(abs)
        let min = (abs - Double(deg)) * 60.0
        let val = isLat
            ? String(format: "%02d%07.4f", deg, min)
            : String(format: "%03d%07.4f", deg, min)
        let dir = isLat ? (decimal >= 0 ? "N" : "S") : (decimal >= 0 ? "E" : "W")
        return (val, dir)
    }
}
