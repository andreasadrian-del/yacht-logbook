import SwiftUI

struct LegRowView: View {
    let leg: [String: AnyJSON]
    let tripID: String?
    let onDelete: () -> Void

    @State private var offset: CGFloat = 0
    @State private var showConfirm = false

    private let deleteWidth: CGFloat = 80
    private let threshold: CGFloat = 60

    var body: some View {
        ZStack(alignment: .trailing) {
            // Delete background
            Button(role: .destructive, action: { showConfirm = true }) {
                Image(systemName: "trash")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.white)
                    .frame(width: deleteWidth)
            }
            .background(Color.red)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .opacity(offset < 0 ? 1 : 0)

            NavigationLink(destination: legDestination) {
                legContent
            }
            .offset(x: offset)
            .gesture(swipeGesture)
        }
        .confirmationDialog("Delete leg?", isPresented: $showConfirm, titleVisibility: .visible) {
            Button("Delete", role: .destructive) { offset = 0; onDelete() }
            Button("Cancel", role: .cancel) { withAnimation(.spring()) { offset = 0 } }
        } message: {
            Text("This moves the leg to the archive.")
        }
    }

    private var legContent: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(legDate)
                    .font(.subheadline.weight(.semibold))
                if let duration = leg["duration_seconds"]?.doubleValue {
                    Text(formatDuration(Int(duration)))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                if let nm = leg["distance_nm"]?.doubleValue {
                    Text(String(format: "%.1f nm", nm))
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.blue)
                }
                if leg["ended_at"] == nil {
                    Text("Recording")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.red)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var legDestination: some View {
        LegDetailView(legID: legIDString, backTripID: tripID)
    }

    private var swipeGesture: some Gesture {
        DragGesture()
            .onChanged { v in
                if v.translation.width < 0 { offset = max(-deleteWidth, v.translation.width) }
            }
            .onEnded { v in
                withAnimation(.spring()) {
                    offset = v.translation.width < -threshold ? -deleteWidth : 0
                }
            }
    }

    private var legDate: String {
        guard let s = leg["started_at"]?.stringValue,
              let date = ISO8601DateFormatter().date(from: s) else { return "—" }
        return date.formatted(date: .abbreviated, time: .omitted)
    }

    private var legIDString: String {
        leg["id"]?.stringValue ?? ""
    }

    private func formatDuration(_ s: Int) -> String {
        let h = s / 3600; let m = (s % 3600) / 60
        return h > 0 ? "\(h)h \(m)m" : "\(m)m"
    }
}
