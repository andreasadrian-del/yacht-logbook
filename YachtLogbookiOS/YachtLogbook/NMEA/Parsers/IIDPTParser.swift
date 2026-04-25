import Foundation

// $IIDPT,x.x,x.x,x.x*hh
// Fields: [1]=depth metres below transducer [2]=offset (positive=below keel, negative=below waterline) [3]=max range
struct IIDPTParser: NMEASentenceParser {
    static let sentenceID = "IIDPT"

    static func parse(fields: [String], into state: inout VesselState) -> Bool {
        guard fields.count >= 2 else { return false }
        // Only update if IIDBT hasn't already set a value this cycle
        if state.depthMetres == nil, let depth = NMEA.double(fields[1]) {
            state.depthMetres = depth
        }
        return true
    }
}
