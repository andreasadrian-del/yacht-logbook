import {
  getLegs, getLeg, getDeletedLegs, createLeg,
  updateLegPosition, stopLeg, softDeleteLeg, restoreLeg, hardDeleteLeg,
  groupLegsIntoTrips,
} from '@/lib/db/legs'

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeChain(result = { data: null, error: null }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
  }
  chain.then = (res, rej) => Promise.resolve(result).then(res, rej)
  return chain
}

function makeSb(result) {
  const chain = makeChain(result)
  return { sb: { from: jest.fn().mockReturnValue(chain) }, chain }
}

// Returns a mock where each successive from() call can return a different result.
function makeSeqSb(results) {
  let i = 0
  const chains = results.map(r => makeChain(r))
  const sb = { from: jest.fn().mockImplementation(() => chains[i++] ?? chains[chains.length - 1]) }
  return { sb, chains }
}

// ── getLegs ───────────────────────────────────────────────────────────────────

describe('getLegs', () => {
  it('returns data on success', async () => {
    const rows = [{ id: '1', started_at: '2025-01-01T00:00:00Z' }]
    const { sb } = makeSb({ data: rows, error: null })
    const result = await getLegs(sb)
    expect(result).toEqual({ data: rows, error: null })
  })

  it('filters out deleted legs', async () => {
    const { sb, chain } = makeSb({ data: [], error: null })
    await getLegs(sb)
    expect(chain.is).toHaveBeenCalledWith('deleted_at', null)
  })

  it('orders by started_at descending', async () => {
    const { sb, chain } = makeSb({ data: [], error: null })
    await getLegs(sb)
    expect(chain.order).toHaveBeenCalledWith('started_at', { ascending: false })
  })

  it('propagates errors', async () => {
    const err = { message: 'db error' }
    const { sb } = makeSb({ data: null, error: err })
    const result = await getLegs(sb)
    expect(result).toEqual({ data: null, error: err })
  })
})

// ── getLeg ────────────────────────────────────────────────────────────────────

describe('getLeg', () => {
  it('returns data on success', async () => {
    const row = { id: 'abc', user_id: 'u1' }
    const { sb } = makeSb({ data: row, error: null })
    const result = await getLeg(sb, 'abc', 'u1')
    expect(result).toEqual({ data: row, error: null })
  })

  it('filters by id and user_id', async () => {
    const { sb, chain } = makeSb({ data: {}, error: null })
    await getLeg(sb, 'abc', 'u1')
    expect(chain.eq).toHaveBeenCalledWith('id', 'abc')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1')
  })

  it('propagates errors', async () => {
    const err = { message: 'not found' }
    const { sb } = makeSb({ data: null, error: err })
    const result = await getLeg(sb, 'x', 'y')
    expect(result).toEqual({ data: null, error: err })
  })
})

// ── getDeletedLegs ────────────────────────────────────────────────────────────

describe('getDeletedLegs', () => {
  it('returns deleted legs', async () => {
    const rows = [{ id: '1', deleted_at: '2025-06-01T00:00:00Z' }]
    const { sb } = makeSb({ data: rows, error: null })
    const result = await getDeletedLegs(sb)
    expect(result).toEqual({ data: rows, error: null })
  })

  it('filters for non-null deleted_at', async () => {
    const { sb, chain } = makeSb({ data: [], error: null })
    await getDeletedLegs(sb)
    expect(chain.not).toHaveBeenCalledWith('deleted_at', 'is', null)
  })

  it('orders by deleted_at descending', async () => {
    const { sb, chain } = makeSb({ data: [], error: null })
    await getDeletedLegs(sb)
    expect(chain.order).toHaveBeenCalledWith('deleted_at', { ascending: false })
  })
})

// ── createLeg ─────────────────────────────────────────────────────────────────

describe('createLeg', () => {
  it('returns new row on success', async () => {
    const row = { id: 'new-id' }
    const { sb } = makeSb({ data: row, error: null })
    const result = await createLeg(sb, 'u1')
    expect(result).toEqual({ data: row, error: null })
  })

  it('inserts with user_id and a started_at ISO string', async () => {
    const { sb, chain } = makeSb({ data: { id: 'x' }, error: null })
    await createLeg(sb, 'u1')
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', started_at: expect.any(String) })
    )
  })

  it('propagates errors', async () => {
    const err = { message: 'insert failed' }
    const { sb } = makeSb({ data: null, error: err })
    const result = await createLeg(sb, 'u1')
    expect(result).toEqual({ data: null, error: err })
  })
})

// ── updateLegPosition ─────────────────────────────────────────────────────────

describe('updateLegPosition', () => {
  it('updates last_lat and last_lng', async () => {
    const { sb, chain } = makeSb({ data: null, error: null })
    await updateLegPosition(sb, 'id1', 51.5, 4.2)
    expect(chain.update).toHaveBeenCalledWith({ last_lat: 51.5, last_lng: 4.2 })
    expect(chain.eq).toHaveBeenCalledWith('id', 'id1')
  })

  it('propagates errors', async () => {
    const err = { message: 'update failed' }
    const { sb } = makeSb({ data: null, error: err })
    const result = await updateLegPosition(sb, 'id1', 0, 0)
    expect(result).toEqual({ error: err })
  })
})

// ── stopLeg ───────────────────────────────────────────────────────────────────

describe('stopLeg', () => {
  it('updates all stop fields', async () => {
    const { sb, chain } = makeSb({ data: null, error: null })
    await stopLeg(sb, 'id1', { endedAt: '2025-01-01T12:00:00Z', durationSeconds: 3600, distanceNm: 5.2, lastLat: 51.5, lastLng: 4.2 })
    expect(chain.update).toHaveBeenCalledWith({
      ended_at: '2025-01-01T12:00:00Z',
      duration_seconds: 3600,
      distance_nm: 5.2,
      last_lat: 51.5,
      last_lng: 4.2,
    })
  })

  it('omits last position fields when not provided', async () => {
    const { sb, chain } = makeSb({ data: null, error: null })
    await stopLeg(sb, 'id1', { endedAt: '2025-01-01T12:00:00Z', durationSeconds: 3600, distanceNm: 5.2, lastLat: null, lastLng: null })
    expect(chain.update).toHaveBeenCalledWith({
      ended_at: '2025-01-01T12:00:00Z',
      duration_seconds: 3600,
      distance_nm: 5.2,
    })
  })

  it('propagates errors', async () => {
    const err = { message: 'failed' }
    const { sb } = makeSb({ data: null, error: err })
    const result = await stopLeg(sb, 'id1', { endedAt: '', durationSeconds: 0, distanceNm: 0 })
    expect(result).toEqual({ error: err })
  })
})

// ── softDeleteLeg ─────────────────────────────────────────────────────────────

describe('softDeleteLeg', () => {
  it('sets deleted_at to an ISO string', async () => {
    const { sb, chain } = makeSb({ data: null, error: null })
    await softDeleteLeg(sb, 'id1')
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) })
    )
    expect(chain.eq).toHaveBeenCalledWith('id', 'id1')
  })

  it('propagates errors', async () => {
    const err = { message: 'failed' }
    const { sb } = makeSb({ data: null, error: err })
    expect(await softDeleteLeg(sb, 'id1')).toEqual({ error: err })
  })
})

// ── restoreLeg ────────────────────────────────────────────────────────────────

describe('restoreLeg', () => {
  it('sets deleted_at to null', async () => {
    const { sb, chain } = makeSb({ data: null, error: null })
    await restoreLeg(sb, 'id1')
    expect(chain.update).toHaveBeenCalledWith({ deleted_at: null })
    expect(chain.eq).toHaveBeenCalledWith('id', 'id1')
  })

  it('propagates errors', async () => {
    const err = { message: 'failed' }
    const { sb } = makeSb({ data: null, error: err })
    expect(await restoreLeg(sb, 'id1')).toEqual({ error: err })
  })
})

// ── hardDeleteLeg ─────────────────────────────────────────────────────────────

describe('hardDeleteLeg', () => {
  it('deletes from all four tables in order', async () => {
    const ok = { data: null, error: null }
    const { sb } = makeSeqSb([ok, ok, ok, ok])
    await hardDeleteLeg(sb, 'id1')
    expect(sb.from.mock.calls.map(c => c[0])).toEqual([
      'track_points', 'logbook_entries', 'trip_notes', 'legs',
    ])
  })

  it('returns no error on success', async () => {
    const ok = { data: null, error: null }
    const { sb } = makeSeqSb([ok, ok, ok, ok])
    const result = await hardDeleteLeg(sb, 'id1')
    expect(result).toEqual({ error: null })
  })

  it('stops and returns error if a supporting table delete fails', async () => {
    const err = { message: 'constraint' }
    const ok = { data: null, error: null }
    const { sb } = makeSeqSb([{ data: null, error: err }, ok, ok, ok])
    const result = await hardDeleteLeg(sb, 'id1')
    expect(result).toEqual({ error: err })
    expect(sb.from).toHaveBeenCalledTimes(1)
  })

  it('propagates error from the legs delete', async () => {
    const err = { message: 'legs delete failed' }
    const ok = { data: null, error: null }
    const { sb } = makeSeqSb([ok, ok, ok, { data: null, error: err }])
    const result = await hardDeleteLeg(sb, 'id1')
    expect(result).toEqual({ error: err })
  })
})

// ── groupLegsIntoTrips ────────────────────────────────────────────────────────

function makeTrip(id, startDate, endDate, createdAt = '2025-01-01T00:00:00Z') {
  return { id, start_date: startDate, end_date: endDate, created_at: createdAt }
}

function makeLeg(id, startedAt) {
  return { id, started_at: startedAt }
}

describe('groupLegsIntoTrips', () => {
  it('includes a leg on the exact start_date boundary', () => {
    const trips = [makeTrip('t1', '2025-07-01', '2025-07-14')]
    const legs = [makeLeg('l1', '2025-07-01T08:00:00Z')]
    const { grouped } = groupLegsIntoTrips(trips, legs)
    expect(grouped[0].legs.map(l => l.id)).toContain('l1')
  })

  it('includes a leg on the exact end_date boundary', () => {
    const trips = [makeTrip('t1', '2025-07-01', '2025-07-14')]
    const legs = [makeLeg('l1', '2025-07-14T20:00:00Z')]
    const { grouped } = groupLegsIntoTrips(trips, legs)
    expect(grouped[0].legs.map(l => l.id)).toContain('l1')
  })

  it('excludes a leg one day outside the range', () => {
    const trips = [makeTrip('t1', '2025-07-01', '2025-07-14')]
    const legs = [makeLeg('l1', '2025-07-15T08:00:00Z')]
    const { grouped, standaloneLegs } = groupLegsIntoTrips(trips, legs)
    expect(grouped[0].legs).toHaveLength(0)
    expect(standaloneLegs.map(l => l.id)).toContain('l1')
  })

  it('assigns a leg to the first-created trip when ranges overlap', () => {
    const trips = [
      makeTrip('t1', '2025-07-01', '2025-07-14', '2025-01-01T00:00:00Z'),
      makeTrip('t2', '2025-07-01', '2025-07-14', '2025-01-02T00:00:00Z'),
    ]
    const legs = [makeLeg('l1', '2025-07-05T10:00:00Z')]
    const { grouped } = groupLegsIntoTrips(trips, legs)
    const t1 = grouped.find(g => g.trip.id === 't1')
    const t2 = grouped.find(g => g.trip.id === 't2')
    expect(t1.legs.map(l => l.id)).toContain('l1')
    expect(t2.legs).toHaveLength(0)
  })

  it('puts an unmatched leg in standaloneLegs', () => {
    const trips = [makeTrip('t1', '2025-07-01', '2025-07-14')]
    const legs = [makeLeg('l1', '2025-08-01T10:00:00Z')]
    const { standaloneLegs } = groupLegsIntoTrips(trips, legs)
    expect(standaloneLegs.map(l => l.id)).toContain('l1')
  })

  it('returns all legs as standaloneLegs when trips array is empty', () => {
    const legs = [makeLeg('l1', '2025-07-05T10:00:00Z'), makeLeg('l2', '2025-08-01T10:00:00Z')]
    const { grouped, standaloneLegs } = groupLegsIntoTrips([], legs)
    expect(grouped).toHaveLength(0)
    expect(standaloneLegs.map(l => l.id)).toEqual(['l1', 'l2'])
  })

  it('returns empty legs arrays when legs array is empty', () => {
    const trips = [makeTrip('t1', '2025-07-01', '2025-07-14')]
    const { grouped, standaloneLegs } = groupLegsIntoTrips(trips, [])
    expect(grouped[0].legs).toHaveLength(0)
    expect(standaloneLegs).toHaveLength(0)
  })

  it('sorts grouped results by start_date descending', () => {
    const trips = [
      makeTrip('t1', '2025-06-01', '2025-06-30', '2025-01-01T00:00:00Z'),
      makeTrip('t2', '2025-07-01', '2025-07-31', '2025-01-02T00:00:00Z'),
    ]
    const { grouped } = groupLegsIntoTrips(trips, [])
    expect(grouped[0].trip.id).toBe('t2')
    expect(grouped[1].trip.id).toBe('t1')
  })
})
