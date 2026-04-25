import Foundation

// $GPRMC,hhmmss.ss,A,LLLL.LL,a,YYYYY.YY,a,x.x,x.x,DDMMYY,x.x,a*hh
struct GPRMCParser: NMEASentenceParser {
    static let sentenceID = "GPRMC"

    static func parse(fields: [String], into state: inout VesselState) -> Bool {
        guard fields.count >= 9 else { return false }
        guard fields[2] == "A" else { return false } // status must be Active

        if let lat = NMEA.coordinate(value: fields[3], direction: fields[4]) { state.lat = lat }
        if let lon = NMEA.coordinate(value: fields[5], direction: fields[6]) { state.lon = lon }
        if let sog = NMEA.double(fields[7]) { state.sog = sog }
        if let cog = NMEA.double(fields[8]) { state.cog = cog }
        state.positionTime = parseTime(hhmmss: fields[1], ddmmyy: fields.count > 9 ? fields[9] : "")
        return true
    }

    private static func parseTime(hhmmss: String, ddmmyy: String) -> Date? {
        guard hhmmss.count >= 6 else { return nil }
        let h = Int(hhmmss.prefix(2)) ?? 0
        let m = Int(hhmmss.dropFirst(2).prefix(2)) ?? 0
        let s = Int(hhmmss.dropFirst(4).prefix(2)) ?? 0
        var comps = DateComponents()
        comps.hour = h; comps.minute = m; comps.second = s; comps.timeZone = .gmt
        if ddmmyy.count >= 6 {
            comps.day   = Int(ddmmyy.prefix(2))
            comps.month = Int(ddmmyy.dropFirst(2).prefix(2))
            let yr = Int(ddmmyy.dropFirst(4).prefix(2)) ?? 0
            comps.year  = yr + 2000
        }
        return Calendar(identifier: .gregorian).date(from: comps)
    }
}
