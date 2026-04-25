import SwiftUI
import Supabase

struct TripsView: View {
    @EnvironmentObject var supabaseService: SupabaseService

    @State private var trips: [[String: AnyJSON]] = []
    @State private var legs: [[String: AnyJSON]] = []
    @State private var loading = false
    @State private var error: String?
    @State private var showCreateTrip = false
    @State private var editingTrip: [String: AnyJSON]?

    private var grouped: [(trip: [String: AnyJSON], legs: [[String: AnyJSON]])] {
        trips.map { trip in
            guard let start = trip["start_date"]?.stringValue,
                  let end   = trip["end_date"]?.stringValue else { return (trip, []) }
            let matched = legs.filter { leg in
                guard let sa = leg["started_at"]?.stringValue else { return false }
                let date = String(sa.prefix(10))
                return date >= start && date <= end
            }
            return (trip, matched)
        }
    }

    private var standaloneLegs: [[String: AnyJSON]] {
        let assignedIDs = Set(grouped.flatMap { $0.legs }.compactMap { $0["id"]?.stringValue })
        return legs.filter { !assignedIDs.contains($0["id"]?.stringValue ?? "") }
    }

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading…")
                } else if let error {
                    ContentUnavailableView(error, systemImage: "exclamationmark.triangle")
                } else {
                    list
                }
            }
            .navigationTitle("Trips")
            .toolbar {
                Button { showCreateTrip = true } label: {
                    Image(systemName: "plus")
                }
            }
            .task { await fetchAll() }
            .sheet(isPresented: $showCreateTrip, onDismiss: { Task { await fetchAll() } }) {
                CreateTripSheet(supabaseService: supabaseService)
            }
            .sheet(item: $editingTrip, onDismiss: { Task { await fetchAll() } }) { trip in
                EditTripSheet(trip: trip, supabaseService: supabaseService)
            }
        }
    }

    private var list: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(grouped, id: \.trip.legID) { item in
                    TripCardView(
                        trip: item.trip,
                        legs: item.legs,
                        onEdit: { editingTrip = item.trip },
                        onDeleteLeg: { legID in Task { await deleteLeg(legID) } }
                    )
                }
                if !standaloneLegs.isEmpty {
                    Section {
                        ForEach(standaloneLegs, id: \.legID) { leg in
                            LegRowView(leg: leg, tripID: nil) {
                                Task { await deleteLeg(leg.legID) }
                            }
                        }
                    } header: {
                        Text("Standalone Legs")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
            .padding()
        }
    }

    private func fetchAll() async {
        loading = true; error = nil
        do {
            async let t = supabaseService.fetchTrips()
            async let l = supabaseService.fetchLegs()
            (trips, legs) = try await (t, l)
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }

    private func deleteLeg(_ id: String) async {
        guard let uuid = UUID(uuidString: id) else { return }
        try? await supabaseService.softDeleteLeg(id: uuid)
        await fetchAll()
    }
}

// MARK: - Create Trip Sheet

struct CreateTripSheet: View {
    let supabaseService: SupabaseService
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var startDate = Date()
    @State private var endDate = Date()
    @State private var saving = false
    @State private var error = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Trip Name") {
                    TextField("e.g. Summer 2026", text: $name)
                }
                Section("Dates") {
                    DatePicker("Start", selection: $startDate, displayedComponents: .date)
                    DatePicker("End",   selection: $endDate,   displayedComponents: .date)
                }
                if !error.isEmpty {
                    Text(error).foregroundStyle(.red).font(.caption)
                }
            }
            .navigationTitle("New Trip")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { save() }.disabled(name.isEmpty || saving)
                }
            }
        }
    }

    private func save() {
        saving = true
        Task {
            guard let uid = await supabaseService.currentUserID else { return }
            do {
                let fmt = DateFormatter(); fmt.dateFormat = "yyyy-MM-dd"
                try await supabaseService.createTrip(
                    userID: uid,
                    name: name.trimmingCharacters(in: .whitespaces),
                    startDate: fmt.string(from: startDate),
                    endDate: fmt.string(from: endDate)
                )
                dismiss()
            } catch { self.error = error.localizedDescription }
            saving = false
        }
    }
}

// MARK: - Edit Trip Sheet

struct EditTripSheet: View {
    let trip: [String: AnyJSON]
    let supabaseService: SupabaseService
    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var startDate: Date
    @State private var endDate: Date
    @State private var saving = false
    @State private var error = ""

    init(trip: [String: AnyJSON], supabaseService: SupabaseService) {
        self.trip = trip
        self.supabaseService = supabaseService
        let fmt = DateFormatter(); fmt.dateFormat = "yyyy-MM-dd"
        _name      = State(initialValue: trip["name"]?.stringValue ?? "")
        _startDate = State(initialValue: fmt.date(from: trip["start_date"]?.stringValue ?? "") ?? Date())
        _endDate   = State(initialValue: fmt.date(from: trip["end_date"]?.stringValue ?? "")   ?? Date())
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Trip Name") { TextField("Name", text: $name) }
                Section("Dates") {
                    DatePicker("Start", selection: $startDate, displayedComponents: .date)
                    DatePicker("End",   selection: $endDate,   displayedComponents: .date)
                }
                if !error.isEmpty { Text(error).foregroundStyle(.red).font(.caption) }
            }
            .navigationTitle("Edit Trip")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }.disabled(name.isEmpty || saving)
                }
            }
        }
    }

    private func save() {
        guard let idStr = trip["id"]?.stringValue, let id = UUID(uuidString: idStr) else { return }
        saving = true
        Task {
            do {
                let fmt = DateFormatter(); fmt.dateFormat = "yyyy-MM-dd"
                try await supabaseService.updateTrip(
                    id: id,
                    name: name.trimmingCharacters(in: .whitespaces),
                    startDate: fmt.string(from: startDate),
                    endDate: fmt.string(from: endDate)
                )
                dismiss()
            } catch { self.error = error.localizedDescription }
            saving = false
        }
    }
}

// Convenience for using dictionary as Identifiable in sheet(item:)
extension Dictionary: Identifiable where Key == String, Value == AnyJSON {
    public var id: String { self["id"]?.stringValue ?? UUID().uuidString }
}
