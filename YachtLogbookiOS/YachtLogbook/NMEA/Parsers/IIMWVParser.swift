import Foundation

// $IIMWV,x.x,a,x.x,a,A*hh
// Fields: [0]=$IIMWV [1]=angle [2]=R/T reference [3]=speed [4]=unit [5]=A/V status
// R = apparent (Relative), T = true
struct IIMWVParser: NMEASentenceParser {
    static let sentenceID = "IIMWV"

    static func parse(fields: [String], into state: inout VesselState) -> Bool {
        guard fields.count >= 6 else { return false }
        guard fields[5] == "A" else { return false } // status valid

        guard let angle = NMEA.double(fields[1]),
              let speed = NMEA.double(fields[3]) else { return false }

        let speedKnots = toKnots(speed, unit: fields[4])
        let reference = fields[2]

        if reference == "R" {
            state.apparentWindAngle = angle
            state.apparentWindSpeed = speedKnots
        } else if reference == "T" {
            state.trueWindAngle = angle
            state.trueWindSpeed = speedKnots
        }
        return true
    }

    private static func toKnots(_ value: Double, unit: String) -> Double {
        switch unit {
        case "M": return value * 1.94384  // m/s → knots
        case "K": return value * 0.539957 // km/h → knots
        default:  return value            // N = already knots
        }
    }
}
