import SwiftUI
import MapKit

struct LegMapView: View {
    let points: [(lat: Double, lon: Double)]

    @State private var region: MKCoordinateRegion?

    var body: some View {
        Map(initialPosition: mapPosition) {
            if points.count >= 2 {
                MapPolyline(coordinates: points.map {
                    CLLocationCoordinate2D(latitude: $0.lat, longitude: $0.lon)
                })
                .stroke(.blue, lineWidth: 2.5)
            }
            if let first = points.first {
                Annotation("Start", coordinate: CLLocationCoordinate2D(latitude: first.lat, longitude: first.lon)) {
                    Circle().fill(.green).frame(width: 10, height: 10)
                }
            }
            if let last = points.last, points.count > 1 {
                Annotation("End", coordinate: CLLocationCoordinate2D(latitude: last.lat, longitude: last.lon)) {
                    Circle().fill(.red).frame(width: 10, height: 10)
                }
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var mapPosition: MapCameraPosition {
        guard !points.isEmpty else { return .automatic }
        let lats = points.map(\.lat)
        let lons = points.map(\.lon)
        let center = CLLocationCoordinate2D(
            latitude: (lats.min()! + lats.max()!) / 2,
            longitude: (lons.min()! + lons.max()!) / 2
        )
        let span = MKCoordinateSpan(
            latitudeDelta: max(0.01, (lats.max()! - lats.min()!) * 1.3),
            longitudeDelta: max(0.01, (lons.max()! - lons.min()!) * 1.3)
        )
        return .region(MKCoordinateRegion(center: center, span: span))
    }
}
