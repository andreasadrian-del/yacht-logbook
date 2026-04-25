import Foundation
import Network

// Monitors internet availability via NWPathMonitor.
// Reports true only when a path with internet connectivity is available —
// this correctly handles the Zeus3 WiFi + LTE scenario where WiFi has no internet.
@MainActor
final class ConnectivityMonitor: ObservableObject {

    @Published private(set) var hasInternet = false

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "connectivity", qos: .utility)

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            let connected = path.status == .satisfied
                && !path.isExpensive == false || path.usesInterfaceType(.cellular)
                || (path.status == .satisfied && path.usesInterfaceType(.cellular))
            Task { @MainActor [weak self] in
                self?.hasInternet = connected
            }
        }
        monitor.start(queue: queue)
    }

    deinit { monitor.cancel() }
}
