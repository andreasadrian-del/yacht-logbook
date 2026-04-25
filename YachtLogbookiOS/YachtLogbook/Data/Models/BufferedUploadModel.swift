import Foundation
import SwiftData

// Generic offline buffer. Each row is a JSON payload waiting to be uploaded.
// Used as a fallback for any entity when internet is unavailable.
@Model
final class BufferedUploadModel {
    @Attribute(.unique) var id: UUID
    var tableName: String
    var payloadJSON: Data
    var createdAt: Date
    var retryCount: Int

    init(tableName: String, payload: [String: Any]) {
        self.id = UUID()
        self.tableName = tableName
        self.payloadJSON = (try? JSONSerialization.data(withJSONObject: payload)) ?? Data()
        self.createdAt = Date()
        self.retryCount = 0
    }
}
