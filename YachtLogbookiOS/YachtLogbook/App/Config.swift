import Foundation

enum Config {
    // MARK: - Supabase
    // Replace with your project values from supabase.com → Project Settings → API
    static let supabaseURL = URL(string: "https://YOUR_PROJECT_REF.supabase.co")!
    static let supabaseAnonKey = "YOUR_ANON_KEY"

    // MARK: - Zeus3 defaults (user can override in Settings)
    static let defaultZeusHost = "192.168.1.1"
    static let defaultZeusPort: UInt16 = 10110

    // MARK: - Simulator
    static let simulatorHost = "127.0.0.1"
    static let simulatorPort: UInt16 = 10110

    // MARK: - GPS fallback timeout
    static let gpsFallbackSeconds: TimeInterval = 5
}
