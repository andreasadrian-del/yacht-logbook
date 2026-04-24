import {
  insertLogbookEntry, getLogbookEntries, deleteLogbookEntries,
} from '@/lib/db/logbook-entries'

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeChain(result = { data: null, error: null }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  }
  chain.then = (res, rej) => Promise.resolve(result).then(res, rej)
  return chain
}

function makeSb(result) {
  const chain = makeChain(result)
  return { sb: { from: jest.fn().mockReturnValue(chain) }, chain }
}

// ── insertLogbookEntry ────────────────────────────────────────────────────────

describe('insertLogbookEntry', () => {
  it('inserts the correct fields', async () => {
    const { sb, chain } = makeSb({ data: null, error: null })
    await insertLogbookEntry(sb, { legId: 'leg-1', eventType: 'tack', recordedAt: '2025-01-01T10:00:00Z', lat: 51.5, lng: 4.2, comment: null })
    expect(chain.insert).toHaveBeenCalledWith({
      trip_id: 'leg-1',
      event_type: 'tack',
      recorded_at: '2025-01-01T10:00:00Z',
      lat: 51.5,
      lng: 4.2,
      comment: null,
    })
  })

  it('stores comment text when provided', async () => {
    const { sb, chain } = makeSb({ data: null, error: null })
    await insertLogbookEntry(sb, { legId: 'leg-1', eventType: 'comment', recordedAt: '2025-01-01T10:00:00Z', lat: null, lng: null, comment: 'Wind picking up' })
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ comment: 'Wind picking up' }))
  })

  it('defaults comment to null when not provided', async () => {
    const { sb, chain } = makeSb({ data: null, error: null })
    await insertLogbookEntry(sb, { legId: 'leg-1', eventType: 'tack', recordedAt: '2025-01-01T10:00:00Z', lat: null, lng: null })
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ comment: null }))
  })

  it('propagates errors', async () => {
    const err = { message: 'insert failed' }
    const { sb } = makeSb({ data: null, error: err })
    expect(await insertLogbookEntry(sb, { legId: 'leg-1', eventType: 'tack', recordedAt: '', lat: null, lng: null })).toEqual({ error: err })
  })
})

// ── getLogbookEntries ─────────────────────────────────────────────────────────

describe('getLogbookEntries', () => {
  it('returns entries on success', async () => {
    const rows = [{ id: '1', event_type: 'tack' }]
    const { sb } = makeSb({ data: rows, error: null })
    expect(await getLogbookEntries(sb, 'leg-1')).toEqual({ data: rows, error: null })
  })

  it('filters by trip_id and orders by recorded_at', async () => {
    const { sb, chain } = makeSb({ data: [], error: null })
    await getLogbookEntries(sb, 'leg-1')
    expect(chain.eq).toHaveBeenCalledWith('trip_id', 'leg-1')
    expect(chain.order).toHaveBeenCalledWith('recorded_at')
  })

  it('propagates errors', async () => {
    const err = { message: 'db error' }
    const { sb } = makeSb({ data: null, error: err })
    expect(await getLogbookEntries(sb, 'leg-1')).toEqual({ data: null, error: err })
  })
})

// ── deleteLogbookEntries ──────────────────────────────────────────────────────

describe('deleteLogbookEntries', () => {
  it('deletes by trip_id', async () => {
    const { sb, chain } = makeSb({ data: null, error: null })
    await deleteLogbookEntries(sb, 'leg-1')
    expect(sb.from).toHaveBeenCalledWith('logbook_entries')
    expect(chain.eq).toHaveBeenCalledWith('trip_id', 'leg-1')
  })

  it('propagates errors', async () => {
    const err = { message: 'delete failed' }
    const { sb } = makeSb({ data: null, error: err })
    expect(await deleteLogbookEntries(sb, 'leg-1')).toEqual({ error: err })
  })
})
