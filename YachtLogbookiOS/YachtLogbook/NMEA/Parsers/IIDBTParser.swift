import Foundation

// $IIDBT,x.x,f,x.x,M,x.x,F*hh
// Fields: [1]=depth feet [2]=f [3]=depth metres [4]=M [5]=depth fathoms [6]=F
struct IIDBTParser: NMEASentenceParser {
    static let sentenceID = "IIDBT"

    static func parse(fields: [String], into state: inout VesselState) -> Bool {
        guard fields.count >= 5 else { return false }
        if let metres = NMEA.double(fields[3]) { state.depthMetres = metres }
        return true
    }
}
