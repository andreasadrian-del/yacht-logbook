import Foundation

// $IIVHW,x.x,T,x.x,M,x.x,N,x.x,K*hh
// Fields: [1]=heading true [2]=T [3]=heading magnetic [4]=M [5]=speed knots [6]=N [7]=speed km/h [8]=K
struct IIVHWParser: NMEASentenceParser {
    static let sentenceID = "IIVHW"

    static func parse(fields: [String], into state: inout VesselState) -> Bool {
        guard fields.count >= 6 else { return false }
        if let kts = NMEA.double(fields[5]) { state.waterSpeed = kts }
        return true
    }
}
