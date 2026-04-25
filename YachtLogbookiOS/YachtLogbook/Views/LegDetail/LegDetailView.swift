import SwiftUI
import Supabase

struct LegDetailView: View {
    let legID: String
    let backTripID: String?

    @EnvironmentObject var supabaseService: SupabaseService

    @State private var leg: [String: AnyJSON]?
    @State private var trackPoints: [[String: AnyJSON]] = []
    @State private var entries: [[String: AnyJSON]] = []
    @State private var notes: [[String: AnyJSON]] = []
    @State private var newNote = ""
    @State private var savingNote = false
    @State private var noteError = ""
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        Group {
            if loading {
                ProgressView("Loading…")
            } else if let error {
                ContentUnavailableView(error, systemImage: "exclamationmark.triangle")
            } else {
                content
            }
        }
        .navigationTitle(legTitle)
        .navigationBarTitleDisplayMode(.inline)
        .task { await fetchAll() }
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Map
                if !mapPoints.isEmpty {
                    LegMapView(points: mapPoints)
                        .frame(height: 220)
                }

                // Stats row
                if let leg {
                    HStack(spacing: 12) {
                        statChip(label: "Duration", value: formatDuration(leg["duration_seconds"]?.doubleValue.map(Int.init)))
                        statChip(label: "Distance", value: leg["distance_nm"].flatMap { String(format: "%.1f nm", $0.doubleValue ?? 0) } ?? "—")
                        if let ds = leg["data_source"]?.stringValue {
                            statChip(label: "Source", value: ds == "zeus3" ? "Zeus3" : "Phone")
                        }
                    }
                }

                // Notes
                noteSection

                // Timeline
                if !entries.isEmpty { eventSection }
            }
            .padding()
        }
    }

    private var noteSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Notes")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
            if !noteError.isEmpty {
                Text(noteError).font(.caption).foregroundStyle(.red)
            }
            HStack(spacing: 8) {
                TextField("Add a note…", text: $newNote, axis: .vertical)
                    .lineLimit(2...4)
                    .padding(10)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                Button("Save") { saveNote() }
                    .disabled(newNote.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || savingNote)
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
            }
            ForEach(notes, id: \.id) { note in
                VStack(alignment: .leading, spacing: 4) {
                    Text(noteDate(note))
                        .font(.caption2).foregroundStyle(.tertiary)
                    Text(note["content"]?.stringValue ?? "")
                        .font(.subheadline)
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    private var eventSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Events")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
            ForEach(entries, id: \.id) { entry in
                HStack {
                    Text(entryTime(entry))
                        .font(.system(.caption, design: .monospaced))
                        .foregroundStyle(.secondary)
                        .frame(width: 50, alignment: .leading)
                    Text(entry["event_type"]?.stringValue?.uppercased() ?? "—")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(Color.blue.opacity(0.1))
                        .foregroundStyle(.blue)
                        .clipShape(Capsule())
                    if let comment = entry["comment"]?.stringValue {
                        Text(comment).font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    private func statChip(label: String, value: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.subheadline.weight(.semibold))
            Text(label).font(.caption2).foregroundStyle(.secondary).textCase(.uppercase)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Data

    private func fetchAll() async {
        loading = true; error = nil
        guard let uuid = UUID(uuidString: legID) else { loading = false; return }
        do {
            async let pts  = supabaseService.fetchTrackPoints(legID: uuid)
            async let evts = supabaseService.fetchLogbookEntries(legID: uuid)
            async let nts  = supabaseService.fetchNotes(legID: uuid)
            (trackPoints, entries, notes) = try await (pts, evts, nts)
            // Fetch leg record separately
            let legs = try await supabaseService.fetchLegs()
            leg = legs.first { $0["id"]?.stringValue == legID }
        } catch { self.error = error.localizedDescription }
        loading = false
    }

    private func saveNote() {
        let content = newNote.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !content.isEmpty, let uuid = UUID(uuidString: legID) else { return }
        savingNote = true; noteError = ""
        Task {
            do {
                try await supabaseService.insertNote(legID: uuid, content: content)
                newNote = ""
                await fetchAll()
            } catch { noteError = "Could not save note." }
            savingNote = false
        }
    }

    // MARK: - Helpers

    private var mapPoints: [(lat: Double, lon: Double)] {
        trackPoints.compactMap { pt in
            guard let lat = pt["lat"]?.doubleValue, let lon = pt["lng"]?.doubleValue else { return nil }
            return (lat, lon)
        }
    }

    private var legTitle: String {
        guard let s = leg?["started_at"]?.stringValue,
              let date = ISO8601DateFormatter().date(from: s) else { return "Leg" }
        return date.formatted(date: .abbreviated, time: .omitted)
    }

    private func formatDuration(_ s: Int?) -> String {
        guard let s else { return "—" }
        let h = s / 3600; let m = (s % 3600) / 60
        return h > 0 ? "\(h)h \(m)m" : "\(m)m"
    }

    private func noteDate(_ note: [String: AnyJSON]) -> String {
        guard let s = note["created_at"]?.stringValue,
              let d = ISO8601DateFormatter().date(from: s) else { return "" }
        return d.formatted(date: .abbreviated, time: .shortened)
    }

    private func entryTime(_ entry: [String: AnyJSON]) -> String {
        guard let s = entry["recorded_at"]?.stringValue,
              let d = ISO8601DateFormatter().date(from: s) else { return "—" }
        return d.formatted(.dateTime.hour().minute())
    }
}

private extension [String: AnyJSON] {
    var id: String { self["id"]?.stringValue ?? UUID().uuidString }
}
