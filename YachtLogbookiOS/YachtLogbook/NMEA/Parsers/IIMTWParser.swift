import Foundation

// $IIMTW,x.x,C*hh
// Fields: [1]=temperature [2]=C (Celsius)
struct IIMTWParser: NMEASentenceParser {
    static let sentenceID = "IIMTW"

    static func parse(fields: [String], into state: inout VesselState) -> Bool {
        guard fields.count >= 2 else { return false }
        if let temp = NMEA.double(fields[1]) { state.waterTemp = temp }
        return true
    }
}
