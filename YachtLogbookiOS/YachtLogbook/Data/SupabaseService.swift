import Foundation
import SwiftData
import Supabase

// All Supabase I/O in one place. Adding a new field: add it to the relevant
// payload dictionary below — no other file needs to change.
@MainActor
final class SupabaseService: ObservableObject {

    private let client: SupabaseClient
    private weak var appState: AppState?
    private var modelContext: ModelContext?

    init(client: SupabaseClient, appState: AppState) {
        self.client = client
        self.appState = appState
    }

    func setModelContext(_ ctx: ModelContext) { modelContext = ctx }

    // MARK: - Auth

    func signIn(email: String, password: String) async throws {
        try await client.auth.signIn(email: email, password: password)
        appState?.isAuthenticated = true
    }

    func signOut() async throws {
        try await client.auth.signOut()
        appState?.isAuthenticated = false
    }

    var currentUserID: UUID? {
        get async {
            try? await client.auth.session?.user.id
        }
    }

    // MARK: - Legs

    func createLeg(userID: UUID) async throws -> UUID {
        let id = UUID()
        let payload: [String: AnyJSON] = [
            "id":         .string(id.uuidString),
            "user_id":    .string(userID.uuidString),
            "started_at": .string(iso(Date())),
        ]
        try await client.from("legs").insert(payload).execute()
        return id
    }

    func stopLeg(id: UUID, endedAt: Date, durationSeconds: Int, distanceNm: Double,
                 lastLat: Double?, lastLng: Double?) async throws {
        var payload: [String: AnyJSON] = [
            "ended_at":         .string(iso(endedAt)),
            "duration_seconds": .double(Double(durationSeconds)),
            "distance_nm":      .double(distanceNm),
        ]
        if let lat = lastLat { payload["last_lat"] = .double(lat) }
        if let lng = lastLng { payload["last_lng"] = .double(lng) }
        try await client.from("legs").update(payload).eq("id", value: id.uuidString).execute()
    }

    func softDeleteLeg(id: UUID) async throws {
        try await client.from("legs")
            .update(["deleted_at": AnyJSON.string(iso(Date()))])
            .eq("id", value: id.uuidString).execute()
    }

    func restoreLeg(id: UUID) async throws {
        try await client.from("legs")
            .update(["deleted_at": AnyJSON.null])
            .eq("id", value: id.uuidString).execute()
    }

    func hardDeleteLeg(id: UUID) async throws {
        let sid = id.uuidString
        try await client.from("track_points").delete().eq("trip_id", value: sid).execute()
        try await client.from("logbook_entries").delete().eq("trip_id", value: sid).execute()
        try await client.from("trip_notes").delete().eq("trip_id", value: sid).execute()
        try await client.from("legs").delete().eq("id", value: sid).execute()
    }

    func fetchLegs() async throws -> [[String: AnyJSON]] {
        try await client.from("legs").select()
            .is("deleted_at", value: nil)
            .order("started_at", ascending: false)
            .execute().value
    }

    func fetchDeletedLegs() async throws -> [[String: AnyJSON]] {
        try await client.from("legs").select()
            .not("deleted_at", operator: .is, value: AnyJSON.null)
            .order("deleted_at", ascending: false)
            .execute().value
    }

    // MARK: - Trips

    func createTrip(userID: UUID, name: String, startDate: String, endDate: String) async throws -> UUID {
        let id = UUID()
        let payload: [String: AnyJSON] = [
            "id":         .string(id.uuidString),
            "user_id":    .string(userID.uuidString),
            "name":       .string(name),
            "start_date": .string(startDate),
            "end_date":   .string(endDate),
        ]
        try await client.from("trips").insert(payload).execute()
        return id
    }

    func updateTrip(id: UUID, name: String, startDate: String, endDate: String) async throws {
        let payload: [String: AnyJSON] = [
            "name":       .string(name),
            "start_date": .string(startDate),
            "end_date":   .string(endDate),
        ]
        try await client.from("trips").update(payload).eq("id", value: id.uuidString).execute()
    }

    func deleteTrip(id: UUID) async throws {
        try await client.from("trips").delete().eq("id", value: id.uuidString).execute()
    }

    func fetchTrips() async throws -> [[String: AnyJSON]] {
        try await client.from("trips").select()
            .order("start_date", ascending: false)
            .execute().value
    }

    // MARK: - Track points

    func insertTrackPoints(_ points: [TrackPointModel]) async throws {
        let payloads = points.map { trackPointPayload($0) }
        try await client.from("track_points").insert(payloads).execute()
    }

    func fetchTrackPoints(legID: UUID) async throws -> [[String: AnyJSON]] {
        try await client.from("track_points").select()
            .eq("trip_id", value: legID.uuidString)
            .order("recorded_at")
            .execute().value
    }

    // Adding a new NMEA field = one new line here + Supabase migration column
    private func trackPointPayload(_ pt: TrackPointModel) -> [String: AnyJSON] {
        var d: [String: AnyJSON] = [
            "trip_id":     .string(pt.legID.uuidString),
            "recorded_at": .string(iso(pt.recordedAt)),
            "lat":         .double(pt.lat),
            "lng":         .double(pt.lng),
            "data_source": .string(pt.dataSource),
        ]
        func opt(_ key: String, _ v: Double?) { if let v { d[key] = .double(v) } }
        opt("speed",                pt.speed)
        opt("course",               pt.course)
        opt("apparent_wind_speed",  pt.apparentWindSpeed)
        opt("apparent_wind_angle",  pt.apparentWindAngle)
        opt("true_wind_speed",      pt.trueWindSpeed)
        opt("true_wind_angle",      pt.trueWindAngle)
        opt("true_wind_direction",  pt.trueWindDirection)
        opt("depth",                pt.depthMetres)
        opt("water_speed",          pt.waterSpeed)
        opt("water_temp",           pt.waterTemp)
        opt("heading_magnetic",     pt.headingMagnetic)
        opt("heading_true",         pt.headingTrue)
        opt("heel_angle",           pt.heelAngle)
        return d
    }

    // MARK: - Logbook entries

    func insertLogbookEntry(_ entry: LogbookEntryModel) async throws {
        var payload: [String: AnyJSON] = [
            "trip_id":     .string(entry.legID.uuidString),
            "event_type":  .string(entry.eventType),
            "recorded_at": .string(iso(entry.recordedAt)),
        ]
        if let c = entry.comment { payload["comment"] = .string(c) }
        if let lat = entry.lat   { payload["lat"] = .double(lat) }
        if let lng = entry.lng   { payload["lng"] = .double(lng) }
        try await client.from("logbook_entries").insert(payload).execute()
    }

    func fetchLogbookEntries(legID: UUID) async throws -> [[String: AnyJSON]] {
        try await client.from("logbook_entries").select()
            .eq("trip_id", value: legID.uuidString)
            .order("recorded_at")
            .execute().value
    }

    // MARK: - Trip notes

    func insertNote(legID: UUID, content: String) async throws {
        let payload: [String: AnyJSON] = [
            "trip_id": .string(legID.uuidString),
            "content": .string(content),
        ]
        try await client.from("trip_notes").insert(payload).execute()
    }

    func fetchNotes(legID: UUID) async throws -> [[String: AnyJSON]] {
        try await client.from("trip_notes").select()
            .eq("trip_id", value: legID.uuidString)
            .order("created_at")
            .execute().value
    }

    // MARK: - Offline buffer sync

    func flushBuffer(context: ModelContext) async {
        let descriptor = FetchDescriptor<BufferedUploadModel>(
            sortBy: [SortDescriptor(\.createdAt)]
        )
        guard let items = try? context.fetch(descriptor), !items.isEmpty else { return }
        appState?.syncStatus = .syncing

        for item in items {
            guard let payload = try? JSONSerialization.jsonObject(with: item.payloadJSON) as? [String: Any] else {
                context.delete(item)
                continue
            }
            do {
                try await client.from(item.tableName).insert(payload).execute()
                context.delete(item)
            } catch {
                item.retryCount += 1
                if item.retryCount > 10 { context.delete(item) }
            }
        }
        try? context.save()
        appState?.syncStatus = .idle
    }

    // MARK: - Helpers

    private func iso(_ date: Date) -> String {
        ISO8601DateFormatter().string(from: date)
    }
}
