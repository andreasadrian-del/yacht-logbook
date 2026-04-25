import Foundation

// Protocol every sentence-type parser must conform to.
// To add a new sentence type:
//   1. Create a new struct conforming to NMEASentenceParser
//   2. Register it in NMEAParserRegistry.swift — nothing else changes
protocol NMEASentenceParser {
    // The sentence ID this parser handles, e.g. "GPRMC", "IIMWV"
    static var sentenceID: String { get }

    // Parse the sentence and apply any parsed values to state.
    // Fields is the comma-split array of the full sentence (index 0 = "$GPRMC" etc.)
    // Returns false if the sentence is malformed or values are invalid.
    @discardableResult
    static func parse(fields: [String], into state: inout VesselState) -> Bool
}

// MARK: - Shared NMEA helpers

enum NMEA {
    // Verify the NMEA checksum. Sentence must include the '*XX' suffix.
    static func checksumValid(_ sentence: String) -> Bool {
        guard let star = sentence.lastIndex(of: "*"),
              sentence.distance(from: star, to: sentence.endIndex) >= 3 else { return false }
        let body = sentence.dropFirst()                      // strip leading '$'
        let bodyEnd = sentence.index(before: star)
        let computed = body[body.startIndex...bodyEnd].reduce(0) { $0 ^ $1.asciiValue! }
        let hexStr = String(sentence[sentence.index(after: star)...].prefix(2))
        return UInt8(hexStr, radix: 16) == computed
    }

    // Split a raw NMEA sentence into fields. Strips checksum suffix.
    static func fields(_ sentence: String) -> [String] {
        var s = sentence
        if let star = s.lastIndex(of: "*") { s = String(s[..<star]) }
        return s.components(separatedBy: ",")
    }

    // Convert NMEA lat/lon (DDMM.MMMMM, N/S or E/W) to decimal degrees
    static func coordinate(value: String, direction: String) -> Double? {
        guard !value.isEmpty, let dotIdx = value.firstIndex(of: ".") else { return nil }
        let degLen = value.distance(from: value.startIndex, to: dotIdx) - 2
        guard degLen >= 1 else { return nil }
        let degStr = String(value.prefix(degLen))
        let minStr = String(value.suffix(from: value.index(value.startIndex, offsetBy: degLen)))
        guard let deg = Double(degStr), let min = Double(minStr) else { return nil }
        var decimal = deg + min / 60.0
        if direction == "S" || direction == "W" { decimal = -decimal }
        return decimal
    }

    // Parse an optional Double field; returns nil if empty or non-numeric
    static func double(_ s: String) -> Double? {
        s.isEmpty ? nil : Double(s)
    }
}
