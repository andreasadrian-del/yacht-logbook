import SwiftUI
import Supabase

struct ArchiveView: View {
    @EnvironmentObject var supabaseService: SupabaseService

    @State private var legs: [[String: AnyJSON]] = []
    @State private var loading = false
    @State private var actionError: String?
    @State private var confirmItem: [String: AnyJSON]?
    @State private var confirmMode: ConfirmMode = .restore

    enum ConfirmMode { case restore, hardDelete }

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading…")
                } else if legs.isEmpty {
                    ContentUnavailableView("No archived legs", systemImage: "archivebox")
                } else {
                    list
                }
            }
            .navigationTitle("Archive")
            .task { await fetch() }
            .confirmationDialog(
                confirmMode == .restore ? "Restore leg?" : "Delete permanently?",
                isPresented: Binding(get: { confirmItem != nil }, set: { if !$0 { confirmItem = nil } }),
                titleVisibility: .visible
            ) {
                Button(confirmMode == .restore ? "Restore" : "Delete Permanently",
                       role: confirmMode == .hardDelete ? .destructive : .none) {
                    if let item = confirmItem { Task { await perform(item) } }
                }
                Button("Cancel", role: .cancel) { confirmItem = nil }
            }
        }
    }

    private var list: some View {
        ScrollView {
            LazyVStack(spacing: 8) {
                if let err = actionError {
                    Text(err).font(.caption).foregroundStyle(.red).padding(.horizontal)
                }
                ForEach(legs, id: \.legID) { leg in
                    archivedRow(leg)
                }
            }
            .padding()
        }
    }

    private func archivedRow(_ leg: [String: AnyJSON]) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(legDate(leg))
                    .font(.subheadline.weight(.semibold))
                if let dur = leg["duration_seconds"]?.doubleValue {
                    Text(formatDuration(Int(dur)))
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
            Button { confirmMode = .restore; confirmItem = leg } label: {
                Label("Restore", systemImage: "arrow.uturn.backward")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.blue)
                    .padding(.horizontal, 10).padding(.vertical, 6)
                    .background(Color.blue.opacity(0.1))
                    .clipShape(Capsule())
            }
            Button { confirmMode = .hardDelete; confirmItem = leg } label: {
                Image(systemName: "trash")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.red)
                    .padding(8)
                    .background(Color.red.opacity(0.1))
                    .clipShape(Circle())
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 12)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func fetch() async {
        loading = true
        legs = (try? await supabaseService.fetchDeletedLegs()) ?? []
        loading = false
    }

    private func perform(_ leg: [String: AnyJSON]) async {
        guard let idStr = leg["id"]?.stringValue, let id = UUID(uuidString: idStr) else { return }
        actionError = nil
        do {
            if confirmMode == .restore {
                try await supabaseService.restoreLeg(id: id)
            } else {
                try await supabaseService.hardDeleteLeg(id: id)
            }
            confirmItem = nil
            await fetch()
        } catch {
            actionError = confirmMode == .restore ? "Could not restore leg." : "Could not delete leg."
        }
    }

    private func legDate(_ leg: [String: AnyJSON]) -> String {
        guard let s = leg["started_at"]?.stringValue,
              let d = ISO8601DateFormatter().date(from: s) else { return "—" }
        return d.formatted(date: .abbreviated, time: .omitted)
    }

    private func formatDuration(_ s: Int) -> String {
        let h = s / 3600; let m = (s % 3600) / 60
        return h > 0 ? "\(h)h \(m)m" : "\(m)m"
    }
}

private extension [String: AnyJSON] {
    var legID: String { self["id"]?.stringValue ?? UUID().uuidString }
}
