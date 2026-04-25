import Foundation

// $IIHDG,x.x,x.x,a,x.x,a*hh
// Fields: [1]=magnetic heading [2]=deviation [3]=E/W [4]=variation [5]=E/W
struct IIHDGParser: NMEASentenceParser {
    static let sentenceID = "IIHDG"

    static func parse(fields: [String], into state: inout VesselState) -> Bool {
        guard fields.count >= 2 else { return false }
        if let hdg = NMEA.double(fields[1]) { state.headingMagnetic = hdg }
        return true
    }
}
