import Foundation

// Central registry. To add a new sentence type, add one line here.
// No other file needs to change.
enum NMEAParserRegistry {

    private static let parsers: [String: (([String], inout VesselState) -> Bool)] = {
        func reg<T: NMEASentenceParser>(_ t: T.Type) -> (String, ([String], inout VesselState) -> Bool) {
            (T.sentenceID, { T.parse(fields: $0, into: &$1) })
        }
        return Dictionary(uniqueKeysWithValues: [
            reg(GPRMCParser.self),
            reg(GPGGAParser.self),
            reg(IIMWVParser.self),
            reg(IIMWDParser.self),
            reg(IIDBTParser.self),
            reg(IIDPTParser.self),
            reg(IIVHWParser.self),
            reg(IIMTWParser.self),
            reg(IIHDGParser.self),
            reg(IIHDTParser.self),
            reg(IIXDRParser.self),
        ])
    }()

    // Parse one raw NMEA sentence. Returns false if unknown type or invalid checksum.
    @discardableResult
    static func parse(_ sentence: String, into state: inout VesselState) -> Bool {
        guard NMEA.checksumValid(sentence) else { return false }
        let fields = NMEA.fields(sentence)
        guard let id = fields.first?.dropFirst(),   // strip leading '$'
              let handler = parsers[String(id)] else { return false }
        return handler(fields, &state)
    }
}
