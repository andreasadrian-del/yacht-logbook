import SwiftUI

struct TripCardView: View {
    let trip: [String: AnyJSON]
    let legs: [[String: AnyJSON]]
    let onEdit: () -> Void
    let onDeleteLeg: (String) -> Void

    @State private var expanded = true

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Button(action: { withAnimation(.spring(duration: 0.25)) { expanded.toggle() } }) {
                    HStack(spacing: 8) {
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.bold))
                            .rotationEffect(.degrees(expanded ? 90 : 0))
                            .foregroundStyle(.secondary)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(trip["name"]?.stringValue ?? "Unnamed Trip")
                                .font(.headline)
                            Text(tripDateRange)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text("\(legs.count) leg\(legs.count == 1 ? "" : "s")")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .buttonStyle(.plain)

                Button(action: onEdit) {
                    Image(systemName: "pencil")
                        .font(.subheadline)
                        .foregroundStyle(.blue)
                        .padding(8)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(Color(.tertiarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))

            if expanded && !legs.isEmpty {
                VStack(spacing: 6) {
                    ForEach(legs, id: \.legID) { leg in
                        LegRowView(
                            leg: leg,
                            tripID: trip["id"]?.stringValue,
                            onDelete: { onDeleteLeg(leg.legID) }
                        )
                        .padding(.leading, 16)
                    }
                }
                .padding(.top, 6)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }

    private var tripDateRange: String {
        let start = trip["start_date"]?.stringValue ?? ""
        let end   = trip["end_date"]?.stringValue ?? ""
        return start == end ? start : "\(start) – \(end)"
    }
}

private extension [String: AnyJSON] {
    var legID: String { self["id"]?.stringValue ?? UUID().uuidString }
}
