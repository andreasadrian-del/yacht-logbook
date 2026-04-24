import {
  insertTrackPoints, getTrackPoints, getTrackPointsForLegs, deleteTrackPoints,
} from '@/lib/db/track-points'

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeChain(result = { data: null, error: null }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  }
  chain.then = (res, rej) => Promise.resolve(result).then(res, rej)
  return chain
}

function makeSb(result) {
  const chain = makeChain(result)
  return { sb: { from: jest.fn().mockReturnValue(chain) }, chain }
}

// ── insertTrackPoints ─────────────────────────────────────────────────────────

describe('insertTrackPoints', () => {
  it('maps points to the correct insert shape', async () => {
    const { sb, chain } = makeSb({ data: null, error: null })
    const points = [
      { recorded_at: '2025-01-01T10:00:00Z', lat: 51.5, lng: 4.2, speed: 5.1, course: 180 },
      { recorded_at: '2025-01-01T10:00:30Z', lat: 51.51, lng: 4.21, speed: 5.3, course: 182 },
    ]
    await insertTrackPoints(sb, 'leg-1', points)
    expect(chain.insert).toHaveBeenCalledWith([
      { trip_id: 'leg-1', recorded_at: '2025-01-01T10:00:00Z', lat: 51.5, lng: 4.2, speed: 5.1, course: 180 },
      { trip_id: 'leg-1', recorded_at: '2025-01-01T10:00:30Z', lat: 51.51, lng: 4.21, speed: 5.3, course: 182 },
    ])
  })

  it('propagates errors', async () => {
    const err = { message: 'insert failed' }
    const { sb } = makeSb({ data: null, error: err })
    expect(await insertTrackPoints(sb, 'leg-1', [])).toEqual({ error: err })
  })
})

// ── getTrackPoints ────────────────────────────────────────────────────────────

describe('getTrackPoints', () => {
  it('applies parseFloat to lat and lng', async () => {
    const raw = [
      { lat: '51.50000', lng: '4.20000', speed: 5, course: 180, recorded_at: '2025-01-01T10:00:00Z' },
      { lat: '51.51000', lng: '4.21000', speed: 5.3, course: 182, recorded_at: '2025-01-01T10:00:30Z' },
    ]
    const { sb } = makeSb({ data: raw, error: null })
    const { data } = await getTrackPoints(sb, 'leg-1')
    expect(data[0].lat).toBe(51.5)
    expect(data[0].lng).toBe(4.2)
    expect(data[1].lat).toBe(51.51)
    expect(typeof data[0].lat).toBe('number')
    expect(typeof data[0].lng).toBe('number')
  })

  it('preserves non-position fields unchanged', async () => {
    const raw = [{ lat: '51.5', lng: '4.2', speed: 5.1, course: 180, recorded_at: '2025-01-01T10:00:00Z' }]
    const { sb } = makeSb({ data: raw, error: null })
    const { data } = await getTrackPoints(sb, 'leg-1')
    expect(data[0].speed).toBe(5.1)
    expect(data[0].course).toBe(180)
    expect(data[0].recorded_at).toBe('2025-01-01T10:00:00Z')
  })

  it('filters by trip_id and orders by recorded_at', async () => {
    const { sb, chain } = makeSb({ data: [], error: null })
    await getTrackPoints(sb, 'leg-1')
    expect(chain.eq).toHaveBeenCalledWith('trip_id', 'leg-1')
    expect(chain.order).toHaveBeenCalledWith('recorded_at')
  })

  it('propagates errors without applying parseFloat', async () => {
    const err = { message: 'db error' }
    const { sb } = makeSb({ data: null, error: err })
    const result = await getTrackPoints(sb, 'leg-1')
    expect(result).toEqual({ data: null, error: err })
  })
})

// ── getTrackPointsForLegs ─────────────────────────────────────────────────────

describe('getTrackPointsForLegs', () => {
  it('returns empty array without querying when legIds is empty', async () => {
    const { sb } = makeSb({ data: [], error: null })
    const result = await getTrackPointsForLegs(sb, [])
    expect(result).toEqual({ data: [], error: null })
    expect(sb.from).not.toHaveBeenCalled()
  })

  it('uses .in() filter for multiple leg ids', async () => {
    const { sb, chain } = makeSb({ data: [], error: null })
    await getTrackPointsForLegs(sb, ['leg-1', 'leg-2'])
    expect(chain.in).toHaveBeenCalledWith('trip_id', ['leg-1', 'leg-2'])
  })

  it('applies parseFloat to lat and lng', async () => {
    const raw = [{ lat: '51.50000', lng: '4.20000', trip_id: 'leg-1' }]
    const { sb } = makeSb({ data: raw, error: null })
    const { data } = await getTrackPointsForLegs(sb, ['leg-1'])
    expect(data[0].lat).toBe(51.5)
    expect(data[0].lng).toBe(4.2)
    expect(typeof data[0].lat).toBe('number')
  })

  it('propagates errors', async () => {
    const err = { message: 'db error' }
    const { sb } = makeSb({ data: null, error: err })
    expect(await getTrackPointsForLegs(sb, ['leg-1'])).toEqual({ data: null, error: err })
  })
})

// ── deleteTrackPoints ─────────────────────────────────────────────────────────

describe('deleteTrackPoints', () => {
  it('deletes by trip_id', async () => {
    const { sb, chain } = makeSb({ data: null, error: null })
    await deleteTrackPoints(sb, 'leg-1')
    expect(sb.from).toHaveBeenCalledWith('track_points')
    expect(chain.eq).toHaveBeenCalledWith('trip_id', 'leg-1')
  })

  it('propagates errors', async () => {
    const err = { message: 'delete failed' }
    const { sb } = makeSb({ data: null, error: err })
    expect(await deleteTrackPoints(sb, 'leg-1')).toEqual({ error: err })
  })
})
