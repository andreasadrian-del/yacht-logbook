import Foundation

// $GPGGA,hhmmss.ss,LLLL.LL,a,YYYYY.YY,a,x,xx,x.x,x.x,M,x.x,M,x.x,xxxx*hh
// Used as secondary source for position; GPRMC takes priority.
struct GPGGAParser: NMEASentenceParser {
    static let sentenceID = "GPGGA"

    static func parse(fields: [String], into state: inout VesselState) -> Bool {
        guard fields.count >= 7 else { return false }
        guard let fix = Int(fields[6]), fix > 0 else { return false } // fix quality must be > 0

        // Only update position from GPGGA if GPRMC hasn't provided it yet this cycle
        if state.lat == nil, let lat = NMEA.coordinate(value: fields[2], direction: fields[3]) {
            state.lat = lat
        }
        if state.lon == nil, let lon = NMEA.coordinate(value: fields[4], direction: fields[5]) {
            state.lon = lon
        }
        return true
    }
}
