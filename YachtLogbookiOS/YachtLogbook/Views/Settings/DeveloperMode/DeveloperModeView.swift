import SwiftUI

struct DeveloperModeView: View {
    @EnvironmentObject var appState: AppState

    // Live $IIXDR sentences for heel verification
    private var xdrSentences: [NMEALogEntry] {
        appState.nmealog.filter { $0.sentence.contains("IIXDR") }.suffix(20).reversed()
    }

    var body: some View {
        List {
            Section("Connection") {
                LabeledContent("Zeus3 State") {
                    Text(appState.zeusConnectionState.label)
                        .font(.caption)
                        .foregroundStyle(appState.zeusConnectionState.isConnected ? .green : .orange)
                }
                LabeledContent("Position Source") {
                    Text(appState.positionSource.label).font(.caption)
                }
                LabeledContent("Sync Status") {
                    Text(appState.syncStatus.label).font(.caption)
                }
            }

            Section {
                NavigationLink("NMEA Sentence Log (\(appState.nmealog.count))") {
                    NMEALogView()
                }
                NavigationLink("First On-Boat Checklist") {
                    OnBoatChecklistView()
                }
            }

            Section {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Live $IIXDR sentences")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.orange)
                    Text("Verify heel field layout: expect $IIXDR,A,<value>,D,HEEL")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    if xdrSentences.isEmpty {
                        Text("No $IIXDR sentences received yet")
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundStyle(.secondary)
                            .padding(.top, 2)
                    } else {
                        ForEach(xdrSentences) { entry in
                            Text(entry.sentence)
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundStyle(.orange)
                                .textSelection(.enabled)
                        }
                    }
                }
            } header: {
                Text("$IIXDR Heel Verification")
            }

            Section("Current VesselState") {
                stateRow("Lat", appState.vesselState.lat.map { String(format: "%.5f", $0) })
                stateRow("Lon", appState.vesselState.lon.map { String(format: "%.5f", $0) })
                stateRow("SOG", appState.vesselState.sog.map { String(format: "%.1f kn", $0) })
                stateRow("COG", appState.vesselState.cog.map { String(format: "%.0f°", $0) })
                stateRow("AWA", appState.vesselState.apparentWindAngle.map { String(format: "%.0f°", $0) })
                stateRow("AWS", appState.vesselState.apparentWindSpeed.map { String(format: "%.1f kn", $0) })
                stateRow("TWA", appState.vesselState.trueWindAngle.map { String(format: "%.0f°", $0) })
                stateRow("TWS", appState.vesselState.trueWindSpeed.map { String(format: "%.1f kn", $0) })
                stateRow("TWD", appState.vesselState.trueWindDirection.map { String(format: "%.0f°T", $0) })
                stateRow("Depth", appState.vesselState.depthMetres.map { String(format: "%.1f m", $0) })
                stateRow("Water Speed", appState.vesselState.waterSpeed.map { String(format: "%.1f kn", $0) })
                stateRow("Water Temp", appState.vesselState.waterTemp.map { String(format: "%.1f°C", $0) })
                stateRow("Heading Mag", appState.vesselState.headingMagnetic.map { String(format: "%.0f°M", $0) })
                stateRow("Heading True", appState.vesselState.headingTrue.map { String(format: "%.0f°T", $0) })
                stateRow("Heel", appState.vesselState.heelAngle.map { String(format: "%.1f°", $0) })
            }
        }
        .navigationTitle("Developer Mode")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func stateRow(_ label: String, _ value: String?) -> some View {
        LabeledContent(label) {
            Text(value ?? "—")
                .font(.system(.caption, design: .monospaced))
                .foregroundStyle(value == nil ? .tertiary : .primary)
        }
    }
}
