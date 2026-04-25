import SwiftUI

struct ChecklistItem: Identifiable, Codable {
    let id: UUID
    var title: String
    var status: Status
    var notes: String

    enum Status: String, CaseIterable, Codable {
        case pending = "pending"
        case pass    = "pass"
        case fail    = "fail"

        var label: String {
            switch self { case .pending: "Pending"; case .pass: "Pass"; case .fail: "Fail" }
        }
        var color: Color {
            switch self { case .pending: .secondary; case .pass: .green; case .fail: .red }
        }
        var icon: String {
            switch self { case .pending: "circle"; case .pass: "checkmark.circle.fill"; case .fail: "xmark.circle.fill" }
        }
    }
}

struct OnBoatChecklistView: View {
    @State private var items: [ChecklistItem] = Self.defaultItems()
    @State private var expandedID: UUID?

    var body: some View {
        List {
            Section {
                HStack(spacing: 12) {
                    stat("Pass",    count(for: .pass),    .green)
                    stat("Fail",    count(for: .fail),    .red)
                    stat("Pending", count(for: .pending), .secondary)
                }
                .listRowBackground(Color.clear)
            }

            Section("First On-Boat Checklist") {
                ForEach($items) { $item in
                    ChecklistRow(item: $item, isExpanded: expandedID == item.id) {
                        expandedID = expandedID == item.id ? nil : item.id
                    }
                }
            }

            Section {
                Button("Reset All") {
                    for i in items.indices { items[i].status = .pending; items[i].notes = "" }
                }
                .foregroundStyle(.red)
            }
        }
        .navigationTitle("On-Boat Checklist")
        .navigationBarTitleDisplayMode(.inline)
        .onChange(of: items) { save() }
        .onAppear { load() }
    }

    private func stat(_ label: String, _ n: Int, _ color: Color) -> some View {
        VStack(spacing: 2) {
            Text("\(n)").font(.title2.weight(.bold)).foregroundStyle(color)
            Text(label).font(.caption2).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    private func count(for status: ChecklistItem.Status) -> Int {
        items.filter { $0.status == status }.count
    }

    private func save() {
        if let data = try? JSONEncoder().encode(items) {
            UserDefaults.standard.set(data, forKey: "onBoatChecklist")
        }
    }

    private func load() {
        if let data = UserDefaults.standard.data(forKey: "onBoatChecklist"),
           let saved = try? JSONDecoder().decode([ChecklistItem].self, from: data) {
            items = saved
        }
    }

    static func defaultItems() -> [ChecklistItem] {
        let titles = [
            "Zeus3 TCP connection establishes on 192.168.1.1:10110",
            "Raw NMEA sentences appear in the debug log",
            "All expected sentence types received ($GPRMC, $IIMWV, $IIDBT, $IIVHW, $IIMTW, $IIHDG, $IIXDR)",
            "$IIXDR heel angle parses correctly — verify field layout $IIXDR,A,<value>,D,HEEL",
            "Position, SOG and COG display correctly and match the Zeus3 screen",
            "Fallback to iPhone GPS triggers when TCP connection is dropped",
            "Automatic reconnection works when TCP connection is restored",
            "Screen locked — TCP connection stays alive and data keeps flowing",
            "NWPathMonitor detects cellular internet while on Zeus3 WiFi",
            "Supabase upload works in real time over cellular + Zeus3 WiFi simultaneously",
            "Offline buffering activates when cellular is disabled",
            "Buffered data syncs to Supabase when cellular is restored",
            "data_source field correctly records zeus3 vs phone_gps in Supabase",
        ]
        return titles.map { ChecklistItem(id: UUID(), title: $0, status: .pending, notes: "") }
    }
}

// MARK: - Checklist row

struct ChecklistRow: View {
    @Binding var item: ChecklistItem
    let isExpanded: Bool
    let onTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: onTap) {
                HStack(spacing: 12) {
                    Image(systemName: item.status.icon)
                        .foregroundStyle(item.status.color)
                        .font(.title3)
                        .frame(width: 24)
                    Text(item.title)
                        .font(.subheadline)
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.leading)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                }
                .padding(.vertical, 4)
            }
            .buttonStyle(.plain)

            if isExpanded {
                VStack(alignment: .leading, spacing: 10) {
                    Picker("Status", selection: $item.status) {
                        ForEach(ChecklistItem.Status.allCases, id: \.self) { s in
                            Text(s.label).tag(s)
                        }
                    }
                    .pickerStyle(.segmented)

                    TextField("Notes (optional)", text: $item.notes, axis: .vertical)
                        .lineLimit(2...5)
                        .font(.caption)
                        .padding(8)
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .padding(.leading, 36)
                .padding(.top, 8)
                .padding(.bottom, 4)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .animation(.spring(duration: 0.2), value: isExpanded)
    }
}
