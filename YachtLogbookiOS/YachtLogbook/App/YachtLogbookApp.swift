import SwiftUI
import SwiftData
import Supabase

@main
struct YachtLogbookApp: App {

    @StateObject private var appState = AppState()
    @StateObject private var tcpClient: NMEATCPClient
    @StateObject private var connectivity = ConnectivityMonitor()
    @StateObject private var locationManager = LocationManager()
    @StateObject private var supabaseService: SupabaseService

    private let supabase = SupabaseClient(
        supabaseURL: Config.supabaseURL,
        supabaseKey: Config.supabaseAnonKey
    )

    init() {
        let state = AppState()
        let supa = SupabaseClient(supabaseURL: Config.supabaseURL, supabaseKey: Config.supabaseAnonKey)
        _appState = StateObject(wrappedValue: state)
        _tcpClient = StateObject(wrappedValue: NMEATCPClient(appState: state))
        _connectivity = StateObject(wrappedValue: ConnectivityMonitor())
        _locationManager = StateObject(wrappedValue: LocationManager(appState: state))
        _supabaseService = StateObject(wrappedValue: SupabaseService(client: supa, appState: state))
    }

    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            LegModel.self,
            TripModel.self,
            TrackPointModel.self,
            LogbookEntryModel.self,
            TripNoteModel.self,
            BufferedUploadModel.self,
        ])
        let config = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        do {
            return try ModelContainer(for: schema, configurations: [config])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .environmentObject(tcpClient)
                .environmentObject(connectivity)
                .environmentObject(locationManager)
                .environmentObject(supabaseService)
                .modelContainer(sharedModelContainer)
                .onAppear {
                    Task { await checkAuth() }
                }
        }
    }

    private func checkAuth() async {
        do {
            let session = try await supabase.auth.session
            await MainActor.run { appState.isAuthenticated = session != nil }
        } catch {
            await MainActor.run { appState.isAuthenticated = false }
        }
    }
}

// MARK: - Root router

struct RootView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        if appState.isAuthenticated {
            MainTabView()
        } else {
            LoginView()
        }
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            TrackingView()
                .tabItem { Label("Tracking", systemImage: "location.fill") }
            TripsView()
                .tabItem { Label("Trips", systemImage: "map") }
            ArchiveView()
                .tabItem { Label("Archive", systemImage: "archivebox") }
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gear") }
        }
    }
}
