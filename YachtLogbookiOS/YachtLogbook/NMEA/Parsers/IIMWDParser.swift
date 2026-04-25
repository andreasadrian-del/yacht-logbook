import Foundation

// $IIMWD,x.x,T,x.x,M,x.x,N,x.x,M*hh
// Fields: [1]=direction true [2]=T [3]=direction magnetic [4]=M [5]=speed knots [6]=N [7]=speed m/s [8]=M
struct IIMWDParser: NMEASentenceParser {
    static let sentenceID = "IIMWD"

    static func parse(fields: [String], into state: inout VesselState) -> Bool {
        guard fields.count >= 7 else { return false }
        if let twd = NMEA.double(fields[1]) { state.trueWindDirection = twd }
        if let tws = NMEA.double(fields[5]) { state.trueWindSpeedMWD  = tws }
        return true
    }
}
