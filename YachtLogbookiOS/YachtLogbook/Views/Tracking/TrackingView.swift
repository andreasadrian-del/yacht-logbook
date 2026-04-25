import SwiftUI
import SwiftData

struct TrackingView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var supabaseService: SupabaseService
    @EnvironmentObject var locationManager: LocationManager
    @EnvironmentObject var tcpClient: NMEATCPClient
    @EnvironmentObject var connectivity: ConnectivityMonitor
    @Environment(\.modelContext) private var modelContext

    @State private var elapsed: TimeInterval = 0
    @State private var distanceNm: Double = 0
    @State private var savingEvent = false
    @State private var eventError: String?
    @State private var showCommentSheet = false
    @State private var commentText = ""
    @State private var savingComment = false
    @State private var timerTask: Task<Void, Never>?

    private let events = ["TACK", "JIBE", "REEF", "UNREEF", "ENGINE ON", "ENGINE OFF"]
    private let eventColors: [String: Color] = [
        "TACK": .blue, "JIBE": .blue,
        "REEF": .orange, "UNREEF": .orange,
        "ENGINE ON": .green, "ENGINE OFF": .green,
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    statusBar
                    instrumentGrid
                    if appState.isTracking { eventButtons }
                    TrackSlider(
                        tracking: appState.isTracking,
                        disabled: false,
                        onStart: startLeg,
                        onStop: stopLeg
                    )
                    .padding(.horizontal, 2)
                    if let err = eventError {
                        Text(err).font(.caption).foregroundStyle(.red)
                    }
                }
                .padding()
            }
            .navigationTitle("Logbook Nadira")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Sign Out") {
                        Task { try? await supabaseService.signOut() }
                    }.font(.caption)
                }
                if appState.isTracking {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button { showCommentSheet = true } label: {
                            Image(systemName: "bubble.left.fill")
                        }
                    }
                }
            }
            .sheet(isPresented: $showCommentSheet) { commentSheet }
            .onAppear { tcpClient.start(); locationManager.startUpdates(); startTimer() }
            .onDisappear { timerTask?.cancel() }
        }
    }

    // MARK: - Status bar

    private var statusBar: some View {
        HStack(spacing: 8) {
            StatusPill(
                icon: appState.zeusConnectionState.isConnected ? "antenna.radiowaves.left.and.right" : "antenna.radiowaves.left.and.right.slash",
                label: appState.zeusConnectionState.isConnected ? "Zeus3" : "No Zeus3",
                color: appState.zeusConnectionState.isConnected ? .green : .orange
            )
            StatusPill(
                icon: appState.positionSource == .zeus3 ? "mappin.circle.fill" : "location.fill",
                label: appState.positionSource.label,
                color: appState.positionSource == .zeus3 ? .green : .blue
            )
            Spacer()
            StatusPill(
                icon: connectivity.hasInternet ? "icloud.fill" : "icloud.slash",
                label: connectivity.hasInternet ? "Live" : "Buffering",
                color: connectivity.hasInternet ? .green : .orange
            )
        }
    }

    // MARK: - Instrument grid

    private var instrumentGrid: some View {
        let vs = appState.vesselState
        return VStack(spacing: 10) {
            // Row 1: SOG, COG, NM, Time
            HStack(spacing: 10) {
                InstrumentCard(label: "SOG", value: fmt1(vs.sog), unit: "kn", accent: .blue)
                InstrumentCard(label: "COG", value: fmtDeg(vs.cog), unit: "°T")
                InstrumentCard(label: "NM", value: fmt2(distanceNm), unit: "nm")
                InstrumentCard(label: "Time", value: fmtElapsed(elapsed), unit: nil)
            }
            // Row 2: TWD, TWS, Depth, Heading
            HStack(spacing: 10) {
                InstrumentCard(label: "TWD", value: fmtDeg(vs.trueWindDirection), unit: "°T", accent: .teal)
                InstrumentCard(label: "TWS", value: fmt1(vs.trueWindSpeed ?? vs.trueWindSpeedMWD), unit: "kn", accent: .teal)
                InstrumentCard(label: "Depth", value: fmt1(vs.depthMetres), unit: "m", accent: .cyan)
                InstrumentCard(label: "Heading", value: fmtDeg(vs.headingTrue ?? vs.headingMagnetic), unit: "°")
            }
            // Row 3: Heel, Water Temp, AWA, AWS
            HStack(spacing: 10) {
                InstrumentCard(label: "Heel", value: fmtHeel(vs.heelAngle), unit: "°")
                InstrumentCard(label: "Water °C", value: fmt1(vs.waterTemp), unit: "°C")
                InstrumentCard(label: "AWA", value: fmtDeg(vs.apparentWindAngle), unit: "°")
                InstrumentCard(label: "AWS", value: fmt1(vs.apparentWindSpeed), unit: "kn")
            }
            // Position
            HStack {
                Text("Position")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                Spacer()
                Text(fmtPosition(vs.lat, vs.lon))
                    .font(.system(.subheadline, design: .monospaced).weight(.medium))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    // MARK: - Event buttons

    private var eventButtons: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Log Event")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
                ForEach(events, id: \.self) { event in
                    Button { logEvent(event) } label: {
                        Text(event)
                            .font(.caption.weight(.semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background((eventColors[event] ?? .blue).opacity(0.12))
                            .foregroundStyle(eventColors[event] ?? .blue)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .disabled(savingEvent)
                }
            }
        }
    }

    // MARK: - Comment sheet

    private var commentSheet: some View {
        NavigationStack {
            VStack(spacing: 16) {
                TextEditor(text: $commentText)
                    .frame(minHeight: 120)
                    .padding(8)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                Spacer()
            }
            .padding()
            .navigationTitle("Add Comment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showCommentSheet = false; commentText = "" }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { saveComment() }
                        .disabled(commentText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || savingComment)
                }
            }
        }
        .presentationDetents([.medium])
    }

    // MARK: - Actions

    private func startLeg() {
        Task {
            guard let uid = await supabaseService.currentUserID else { return }
            let legID = try await supabaseService.createLeg(userID: uid)
            appState.activeLegID = legID
            appState.legStartTime = Date()
            distanceNm = 0
            elapsed = 0
            startTimer()
        }
    }

    private func stopLeg() {
        guard let legID = appState.activeLegID,
              let startTime = appState.legStartTime else { return }
        let duration = Int(Date().timeIntervalSince(startTime))
        Task {
            try await supabaseService.stopLeg(
                id: legID,
                endedAt: Date(),
                durationSeconds: duration,
                distanceNm: distanceNm,
                lastLat: appState.vesselState.lat,
                lastLng: appState.vesselState.lon
            )
            appState.activeLegID = nil
            appState.legStartTime = nil
        }
    }

    private func logEvent(_ type: String) {
        guard let legID = appState.activeLegID else { return }
        savingEvent = true
        Task {
            let entry = LogbookEntryModel(
                legID: legID,
                eventType: type.lowercased(),
                lat: appState.vesselState.lat,
                lng: appState.vesselState.lon
            )
            do {
                try await supabaseService.insertLogbookEntry(entry)
            } catch {
                eventError = "Could not save event."
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) { eventError = nil }
            }
            savingEvent = false
        }
    }

    private func saveComment() {
        guard let legID = appState.activeLegID else { return }
        let text = commentText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        savingComment = true
        Task {
            let entry = LogbookEntryModel(
                legID: legID,
                eventType: "comment",
                comment: text,
                lat: appState.vesselState.lat,
                lng: appState.vesselState.lon
            )
            do {
                try await supabaseService.insertLogbookEntry(entry)
                commentText = ""
                showCommentSheet = false
            } catch {
                eventError = "Could not save comment."
            }
            savingComment = false
        }
    }

    private func startTimer() {
        timerTask?.cancel()
        timerTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                guard !Task.isCancelled else { break }
                await MainActor.run {
                    if let start = appState.legStartTime {
                        elapsed = Date().timeIntervalSince(start)
                    }
                }
            }
        }
    }

    // MARK: - Formatters

    private func fmt1(_ v: Double?) -> String { v.map { String(format: "%.1f", $0) } ?? "—" }
    private func fmt2(_ v: Double) -> String { String(format: "%.2f", v) }
    private func fmtDeg(_ v: Double?) -> String { v.map { String(format: "%.0f", $0) } ?? "—" }
    private func fmtHeel(_ v: Double?) -> String {
        guard let v else { return "—" }
        return String(format: "%.1f%@", abs(v), v >= 0 ? "S" : "P")
    }
    private func fmtElapsed(_ t: TimeInterval) -> String {
        let h = Int(t) / 3600; let m = (Int(t) % 3600) / 60
        return h > 0 ? "\(h)h\(String(format: "%02d", m))m" : "\(m)m"
    }
    private func fmtPosition(_ lat: Double?, _ lon: Double?) -> String {
        guard let lat, let lon else { return "—" }
        let la = String(format: "%.4f°%@", abs(lat), lat >= 0 ? "N" : "S")
        let lo = String(format: "%.4f°%@", abs(lon), lon >= 0 ? "E" : "W")
        return "\(la)  \(lo)"
    }
}
