import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var tcpClient: NMEATCPClient
    @EnvironmentObject var supabaseService: SupabaseService

    var body: some View {
        NavigationStack {
            Form {
                Section("Zeus3 Connection") {
                    LabeledContent("IP Address") {
                        TextField("192.168.1.1", text: $appState.zeusHost)
                            .multilineTextAlignment(.trailing)
                            .keyboardType(.decimalPad)
                    }
                    LabeledContent("Port") {
                        TextField("10110", value: $appState.zeusPortRaw, format: .number)
                            .multilineTextAlignment(.trailing)
                            .keyboardType(.numberPad)
                    }
                    Button("Reconnect") {
                        tcpClient.stop()
                        tcpClient.start()
                    }
                    .foregroundStyle(.blue)
                }

                Section("Simulator") {
                    Toggle("Simulator Mode", isOn: $appState.simulatorMode)
                        .onChange(of: appState.simulatorMode) { _, _ in
                            tcpClient.stop()
                            tcpClient.start()
                        }
                    if appState.simulatorMode {
                        Text("Connecting to 127.0.0.1:\(Config.simulatorPort) — simulated German Bight scenario")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Status") {
                    LabeledContent("Zeus3") {
                        Text(appState.zeusConnectionState.label)
                            .foregroundStyle(appState.zeusConnectionState.isConnected ? .green : .orange)
                            .font(.caption)
                    }
                    LabeledContent("Position Source") {
                        Text(appState.positionSource.label)
                            .font(.caption)
                    }
                    LabeledContent("Sync") {
                        Text(appState.syncStatus.label)
                            .font(.caption)
                    }
                }

                Section("Developer") {
                    Toggle("Developer / Test Mode", isOn: $appState.developerMode)
                    if appState.developerMode {
                        NavigationLink("Open Developer Mode") {
                            DeveloperModeView()
                        }
                    }
                }

                Section {
                    Button("Sign Out", role: .destructive) {
                        Task { try? await supabaseService.signOut() }
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }
}
