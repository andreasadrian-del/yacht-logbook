import Foundation
import SwiftData

@Model
final class LegModel {
    @Attribute(.unique) var id: UUID
    var userID: UUID
    var startedAt: Date
    var endedAt: Date?
    var durationSeconds: Int?
    var distanceNm: Double?
    var lastLat: Double?
    var lastLng: Double?
    var deletedAt: Date?
    var createdAt: Date

    // Supabase sync state
    var remoteID: UUID?         // UUID assigned by Supabase after first upload
    var needsUpload: Bool       // true = not yet confirmed written to Supabase

    init(userID: UUID) {
        self.id = UUID()
        self.userID = userID
        self.startedAt = Date()
        self.createdAt = Date()
        self.needsUpload = true
    }
}
