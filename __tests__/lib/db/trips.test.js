import {
  getTrips, getTrip, createTrip, updateTrip, deleteTrip,
} from '@/lib/db/trips'

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeChain(result = { data: null, error: null }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
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

// ── getTrips ──────────────────────────────────────────────────────────────────

describe('getTrips', () => {
  it('returns data on success', async () => {
    const rows = [{ id: '1', name: 'Croatia 2025' }]
    const { sb } = makeSb({ data: rows, error: null })
    const result = await getTrips(sb)
    expect(result).toEqual({ data: rows, error: null })
  })

  it('queries the trips table', async () => {
    const { sb } = makeSb({ data: [], error: null })
    await getTrips(sb)
    expect(sb.from).toHaveBeenCalledWith('trips')
  })

  it('orders by start_date descending', async () => {
    const { sb, chain } = makeSb({ data: [], error: null })
    await getTrips(sb)
    expect(chain.order).toHaveBeenCalledWith('start_date', { ascending: false })
  })

  it('propagates errors', async () => {
    const err = { message: 'db error' }
    const { sb } = makeSb({ data: null, error: err })
    expect(await getTrips(sb)).toEqual({ data: null, error: err })
  })
})

// ── getTrip ───────────────────────────────────────────────────────────────────

describe('getTrip', () => {
  it('returns data on success', async () => {
    const row = { id: 'abc', name: 'Test' }
    const { sb } = makeSb({ data: row, error: null })
    const result = await getTrip(sb, 'abc', 'u1')
    expect(result).toEqual({ data: row, error: null })
  })

  it('filters by id and user_id', async () => {
    const { sb, chain } = makeSb({ data: {}, error: null })
    await getTrip(sb, 'abc', 'u1')
    expect(chain.eq).toHaveBeenCalledWith('id', 'abc')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1')
  })

  it('propagates errors', async () => {
    const err = { message: 'not found' }
    const { sb } = makeSb({ data: null, error: err })
    expect(await getTrip(sb, 'x', 'y')).toEqual({ data: null, error: err })
  })
})

// ── createTrip ────────────────────────────────────────────────────────────────

describe('createTrip', () => {
  it('returns new row on success', async () => {
    const row = { id: 'new', name: 'Croatia 2025' }
    const { sb } = makeSb({ data: row, error: null })
    const result = await createTrip(sb, { userId: 'u1', name: 'Croatia 2025', startDate: '2025-07-01', endDate: '2025-07-14' })
    expect(result).toEqual({ data: row, error: null })
  })

  it('inserts the correct fields', async () => {
    const { sb, chain } = makeSb({ data: { id: 'x' }, error: null })
    await createTrip(sb, { userId: 'u1', name: 'Croatia 2025', startDate: '2025-07-01', endDate: '2025-07-14' })
    expect(chain.insert).toHaveBeenCalledWith({
      user_id: 'u1',
      name: 'Croatia 2025',
      start_date: '2025-07-01',
      end_date: '2025-07-14',
    })
  })

  it('propagates errors', async () => {
    const err = { message: 'insert failed' }
    const { sb } = makeSb({ data: null, error: err })
    expect(await createTrip(sb, { userId: 'u1', name: '', startDate: '', endDate: '' })).toEqual({ data: null, error: err })
  })
})

// ── updateTrip ────────────────────────────────────────────────────────────────

describe('updateTrip', () => {
  it('updates the correct fields', async () => {
    const { sb, chain } = makeSb({ data: null, error: null })
    await updateTrip(sb, 'id1', { name: 'New Name', startDate: '2025-07-01', endDate: '2025-07-14' })
    expect(chain.update).toHaveBeenCalledWith({
      name: 'New Name',
      start_date: '2025-07-01',
      end_date: '2025-07-14',
    })
    expect(chain.eq).toHaveBeenCalledWith('id', 'id1')
  })

  it('propagates errors', async () => {
    const err = { message: 'update failed' }
    const { sb } = makeSb({ data: null, error: err })
    expect(await updateTrip(sb, 'id1', { name: '', startDate: '', endDate: '' })).toEqual({ error: err })
  })
})

// ── deleteTrip ────────────────────────────────────────────────────────────────

describe('deleteTrip', () => {
  it('deletes the correct row', async () => {
    const { sb, chain } = makeSb({ data: null, error: null })
    await deleteTrip(sb, 'id1')
    expect(sb.from).toHaveBeenCalledWith('trips')
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'id1')
  })

  it('propagates errors', async () => {
    const err = { message: 'delete failed' }
    const { sb } = makeSb({ data: null, error: err })
    expect(await deleteTrip(sb, 'id1')).toEqual({ error: err })
  })
})
