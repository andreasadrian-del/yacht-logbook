import Foundation

// Single source of truth for all parsed NMEA data.
// Add new fields here when new sentence types are added.
struct VesselState {
    // MARK: - Position (from $GPRMC / $GPGGA)
    var lat: Double?
    var lon: Double?
    var sog: Double?          // speed over ground, knots
    var cog: Double?          // course over ground, degrees true
    var positionTime: Date?   // UTC time of the GPS fix

    // MARK: - Wind (from $IIMWV and $IIMWD)
    var apparentWindSpeed: Double?    // knots
    var apparentWindAngle: Double?    // degrees, bow-relative
    var trueWindSpeed: Double?        // knots, bow-relative (from $IIMWV R=T)
    var trueWindAngle: Double?        // degrees, bow-relative
    var trueWindDirection: Double?    // degrees true, absolute compass (from $IIMWD)
    var trueWindSpeedMWD: Double?     // knots (from $IIMWD, complements IIMWV)

    // MARK: - Depth (from $IIDBT / $IIDPT)
    var depthMetres: Double?

    // MARK: - Speed through water (from $IIVHW)
    var waterSpeed: Double?   // knots

    // MARK: - Water temperature (from $IIMTW)
    var waterTemp: Double?    // degrees Celsius

    // MARK: - Heading (from $IIHDG / $IIHDT)
    var headingMagnetic: Double?   // degrees magnetic
    var headingTrue: Double?       // degrees true

    // MARK: - Heel (from $IIXDR, transducer HEEL)
    var heelAngle: Double?         // degrees (positive = starboard)
}
