import Foundation
import CoreLocation

@MainActor
final class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {

    private weak var appState: AppState?
    private let clManager = CLLocationManager()
    private var fallbackTimer: Timer?

    init(appState: AppState) {
        self.appState = appState
        super.init()
        clManager.delegate = self
        clManager.desiredAccuracy = kCLLocationAccuracyBest
        clManager.distanceFilter = kCLDistanceFilterNone
        clManager.allowsBackgroundLocationUpdates = true
        clManager.pausesLocationUpdatesAutomatically = false
        clManager.requestAlwaysAuthorization()
    }

    func startUpdates() {
        clManager.startUpdatingLocation()
        scheduleFallbackCheck()
    }

    func stopUpdates() {
        clManager.stopUpdatingLocation()
        fallbackTimer?.invalidate()
        fallbackTimer = nil
    }

    // MARK: - CLLocationManagerDelegate

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        Task { @MainActor [weak self] in
            self?.handleLocation(loc)
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Location errors are non-fatal — Zeus3 or next phone fix will recover
    }

    private func handleLocation(_ loc: CLLocation) {
        guard let appState, appState.positionSource == .phoneGPS else { return }
        // Only write phone GPS into vessel state when Zeus3 position is stale
        appState.vesselState.lat = loc.coordinate.latitude
        appState.vesselState.lon = loc.coordinate.longitude
        if loc.speed >= 0 { appState.vesselState.sog = loc.speed * 1.94384 } // m/s → knots
        if loc.course >= 0 { appState.vesselState.cog = loc.course }
        appState.vesselState.positionTime = loc.timestamp
    }

    // MARK: - Fallback check loop

    private func scheduleFallbackCheck() {
        fallbackTimer?.invalidate()
        fallbackTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.appState.flatMap { _ in }
                // Delegate fallback check to TCPClient which tracks last valid NMEA position time
            }
        }
    }
}
