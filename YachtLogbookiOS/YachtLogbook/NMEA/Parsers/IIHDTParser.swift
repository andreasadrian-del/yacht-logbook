import Foundation

// $IIHDT,x.x,T*hh
// Fields: [1]=heading true [2]=T
struct IIHDTParser: NMEASentenceParser {
    static let sentenceID = "IIHDT"

    static func parse(fields: [String], into state: inout VesselState) -> Bool {
        guard fields.count >= 2 else { return false }
        if let hdg = NMEA.double(fields[1]) { state.headingTrue = hdg }
        return true
    }
}
