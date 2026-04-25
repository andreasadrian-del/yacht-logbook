import Foundation
import SwiftData

@Model
final class LogbookEntryModel {
    @Attribute(.unique) var id: UUID
    var legID: UUID
    var recordedAt: Date
    var eventType: String   // tack | jibe | reef | unreef | engine on | engine off | comment
    var comment: String?
    var lat: Double?
    var lng: Double?
    var needsUpload: Bool

    init(legID: UUID, eventType: String, comment: String? = nil, lat: Double?, lng: Double?) {
        self.id = UUID()
        self.legID = legID
        self.recordedAt = Date()
        self.eventType = eventType
        self.comment = comment
        self.lat = lat
        self.lng = lng
        self.needsUpload = true
    }
}
