import Foundation
import SwiftData

@Model
final class TripModel {
    @Attribute(.unique) var id: UUID
    var userID: UUID
    var name: String
    var startDate: String    // ISO date string "YYYY-MM-DD" — matches Supabase date type
    var endDate: String
    var createdAt: Date
    var needsUpload: Bool

    init(userID: UUID, name: String, startDate: String, endDate: String) {
        self.id = UUID()
        self.userID = userID
        self.name = name
        self.startDate = startDate
        self.endDate = endDate
        self.createdAt = Date()
        self.needsUpload = true
    }
}
