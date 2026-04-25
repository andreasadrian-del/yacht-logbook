import Foundation

// $IIXDR,a,x.x,a,c--c,...*hh
// Generic transducer sentence. May repeat multiple transducer groups of 4 fields.
// B&G heel format (best guess, verify on first on-boat test):
//   $IIXDR,A,<value>,D,HEEL
//   type=A (angular), value=degrees, unit=D (degrees), name=HEEL
struct IIXDRParser: NMEASentenceParser {
    static let sentenceID = "IIXDR"

    static func parse(fields: [String], into state: inout VesselState) -> Bool {
        guard fields.count >= 5 else { return false }
        // Walk groups of 4 fields starting at index 1
        var i = 1
        while i + 3 < fields.count {
            let type  = fields[i]
            let value = fields[i + 1]
            let unit  = fields[i + 2]
            let name  = fields[i + 3]

            if type == "A" && unit == "D" && name.uppercased() == "HEEL" {
                if let heel = NMEA.double(value) { state.heelAngle = heel }
            }
            i += 4
        }
        return true
    }
}
