import SwiftUI

struct InstrumentCard: View {
    let label: String
    let value: String
    let unit: String?
    var accent: Color = .primary

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(accent)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            if let unit {
                Text(unit)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.secondary)
            }
            Text(label)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.tertiary)
                .textCase(.uppercase)
                .kerning(0.5)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Status pill

struct StatusPill: View {
    let icon: String
    let label: String
    let color: Color

    var body: some View {
        Label(label, systemImage: icon)
            .font(.caption.weight(.semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }
}

// MARK: - Track slider

struct TrackSlider: View {
    let tracking: Bool
    let disabled: Bool
    let onStart: () -> Void
    let onStop: () -> Void

    @GestureState private var dragOffset: CGFloat = 0
    @State private var completed = false

    private let thumbSize: CGFloat = 52
    private let trackHeight: CGFloat = 60

    var body: some View {
        GeometryReader { geo in
            let travel = geo.size.width - thumbSize - 8
            let thumbX = thumbPosition(travel: travel)

            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: trackHeight / 2)
                    .fill(disabled ? Color.gray.opacity(0.3) : tracking ? Color.red : Color.blue)
                    .animation(.easeInOut(duration: 0.3), value: tracking)

                Text(sliderLabel)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.85))
                    .frame(maxWidth: .infinity)

                Circle()
                    .fill(disabled ? Color.gray : tracking ? Color(red: 0.72, green: 0.11, blue: 0.11) : Color(red: 0.08, green: 0.34, blue: 0.69))
                    .frame(width: thumbSize, height: thumbSize)
                    .shadow(radius: 4, y: 2)
                    .overlay {
                        Image(systemName: tracking ? "stop.fill" : "play.fill")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white)
                    }
                    .offset(x: 4 + thumbX)
                    .gesture(
                        DragGesture(minimumDistance: 4)
                            .updating($dragOffset) { value, state, _ in
                                state = value.translation.width
                            }
                            .onEnded { value in
                                let pct = value.translation.width / travel
                                if !tracking && pct >= 0.72 { onStart() }
                                else if tracking && pct <= -0.72 { onStop() }
                            }
                    )
            }
            .frame(height: trackHeight)
        }
        .frame(height: trackHeight)
        .disabled(disabled)
    }

    private func thumbPosition(travel: CGFloat) -> CGFloat {
        let base: CGFloat = tracking ? travel : 0
        let clamped = max(0, min(travel, base + dragOffset))
        return tracking ? max(0, clamped) : max(0, min(travel, dragOffset > 0 ? dragOffset : 0))
    }

    private var sliderLabel: String {
        if disabled { return "Saving…" }
        return tracking ? "← Slide to stop" : "Slide to start →"
    }
}
