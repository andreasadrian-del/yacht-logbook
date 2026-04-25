import Foundation
import SwiftData

@Model
final class TripNoteModel {
    @Attribute(.unique) var id: UUID
    var legID: UUID
    var content: String
    var createdAt: Date
    var needsUpload: Bool

    init(legID: UUID, content: String) {
        self.id = UUID()
        self.legID = legID
        self.content = content
        self.createdAt = Date()
        self.needsUpload = true
    }
}
