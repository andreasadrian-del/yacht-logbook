import Foundation
import SwiftData

// Mirrors the track_points table including all new NMEA columns.
// Adding a new NMEA field: add a property here, add a column in Supabase migration,
// add one line in SupabaseService.trackPointPayload().
@Model
final class TrackPointModel {
    @Attribute(.unique) var id: UUID
    var legID: UUID             // FK → legs.id (named trip_id in DB for historical reasons)
    var recordedAt: Date
    var lat: Double
    var lng: Double
    var speed: Double?          // SOG knots
    var course: Double?         // COG degrees
    var dataSource: String      // "zeus3" or "phone_gps"

    // NMEA instrument data
    var apparentWindSpeed: Double?
    var apparentWindAngle: Double?
    var trueWindSpeed: Double?
    var trueWindAngle: Double?
    var trueWindDirection: Double?
    var depthMetres: Double?
    var waterSpeed: Double?
    var waterTemp: Double?
    var headingMagnetic: Double?
    var headingTrue: Double?
    var heelAngle: Double?

    var needsUpload: Bool

    init(legID: UUID, recordedAt: Date, lat: Double, lng: Double,
         speed: Double?, course: Double?, dataSource: String, vessel: VesselState) {
        self.id = UUID()
        self.legID = legID
        self.recordedAt = recordedAt
        self.lat = lat
        self.lng = lng
        self.speed = speed
        self.course = course
        self.dataSource = dataSource
        self.apparentWindSpeed  = vessel.apparentWindSpeed
        self.apparentWindAngle  = vessel.apparentWindAngle
        self.trueWindSpeed      = vessel.trueWindSpeed
        self.trueWindAngle      = vessel.trueWindAngle
        self.trueWindDirection  = vessel.trueWindDirection
        self.depthMetres        = vessel.depthMetres
        self.waterSpeed         = vessel.waterSpeed
        self.waterTemp          = vessel.waterTemp
        self.headingMagnetic    = vessel.headingMagnetic
        self.headingTrue        = vessel.headingTrue
        self.heelAngle          = vessel.heelAngle
        self.needsUpload = true
    }
}
