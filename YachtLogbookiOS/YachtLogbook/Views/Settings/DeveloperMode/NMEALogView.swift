import SwiftUI

struct NMEALogView: View {
    @EnvironmentObject var appState: AppState
    @State private var filter = ""
    @State private var paused = false
    @State private var pinnedEntries: [NMEALogEntry] = []

    private var displayed: [NMEALogEntry] {
        let src = paused ? pinnedEntries : appState.nmealog
        guard !filter.isEmpty else { return src.reversed() }
        return src.filter { $0.sentence.contains(filter.uppercased()) }.reversed()
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
                TextField("Filter (e.g. IIMWV, IIXDR)", text: $filter)
                    .autocapitalization(.allCharacters)
                    .textInputAutocapitalization(.characters)
                    .disableAutocorrection(true)
                if !filter.isEmpty {
                    Button { filter = "" } label: {
                        Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary)
                    }
                }
            }
            .padding(10)
            .background(Color(.secondarySystemBackground))

            HStack {
                Text("\(appState.nmealog.count) sentences")
                    .font(.caption).foregroundStyle(.secondary)
                Spacer()
                Button(paused ? "Resume" : "Pause") {
                    if !paused { pinnedEntries = appState.nmealog }
                    paused.toggle()
                }
                .font(.caption.weight(.semibold))
                Button("Clear") { appState.clearLog() }
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.red)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color(.systemBackground))

            Divider()

            ScrollView {
                LazyVStack(alignment: .leading, spacing: 2) {
                    ForEach(displayed) { entry in
                        HStack(alignment: .top, spacing: 8) {
                            Text(entry.timestamp.formatted(.dateTime.hour().minute().second()))
                                .font(.system(size: 10, design: .monospaced))
                                .foregroundStyle(.secondary)
                                .frame(width: 70, alignment: .leading)
                            Text(entry.sentence)
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundStyle(sentenceColor(entry.sentence))
                                .lineLimit(nil)
                                .textSelection(.enabled)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 2)
                    }
                }
                .padding(.vertical, 6)
            }
        }
        .navigationTitle("NMEA Log")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func sentenceColor(_ s: String) -> Color {
        if s.contains("IIXDR") { return .orange }
        if s.contains("IIMWV") || s.contains("IIMWD") { return .teal }
        if s.contains("GPRMC") || s.contains("GPGGA") { return .blue }
        if s.contains("IIDBT") || s.contains("IIDPT") { return .cyan }
        return .primary
    }
}
