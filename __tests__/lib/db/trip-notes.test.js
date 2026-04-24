import { insertNote, getNotes, deleteNotes } from '@/lib/db/trip-notes'

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeChain(result = { data: null, error: null }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
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

// ── insertNote ────────────────────────────────────────────────────────────────

describe('insertNote', () => {
  it('returns the new note on success', async () => {
    const row = { id: 'n1', trip_id: 'leg-1', content: 'Wind picking up' }
    const { sb } = makeSb({ data: row, error: null })
    const result = await insertNote(sb, 'leg-1', 'Wind picking up')
    expect(result).toEqual({ data: row, error: null })
  })

  it('inserts with trip_id and content', async () => {
    const { sb, chain } = makeSb({ data: { id: 'n1' }, error: null })
    await insertNote(sb, 'leg-1', 'Tacking through the channel')
    expect(chain.insert).toHaveBeenCalledWith({ trip_id: 'leg-1', content: 'Tacking through the channel' })
  })

  it('propagates errors', async () => {
    const err = { message: 'insert failed' }
    const { sb } = makeSb({ data: null, error: err })
    expect(await insertNote(sb, 'leg-1', 'text')).toEqual({ data: null, error: err })
  })
})

// ── getNotes ──────────────────────────────────────────────────────────────────

describe('getNotes', () => {
  it('returns notes on success', async () => {
    const rows = [{ id: 'n1', content: 'Wind picking up' }]
    const { sb } = makeSb({ data: rows, error: null })
    expect(await getNotes(sb, 'leg-1')).toEqual({ data: rows, error: null })
  })

  it('filters by trip_id and orders by created_at', async () => {
    const { sb, chain } = makeSb({ data: [], error: null })
    await getNotes(sb, 'leg-1')
    expect(chain.eq).toHaveBeenCalledWith('trip_id', 'leg-1')
    expect(chain.order).toHaveBeenCalledWith('created_at')
  })

  it('propagates errors', async () => {
    const err = { message: 'db error' }
    const { sb } = makeSb({ data: null, error: err })
    expect(await getNotes(sb, 'leg-1')).toEqual({ data: null, error: err })
  })
})

// ── deleteNotes ───────────────────────────────────────────────────────────────

describe('deleteNotes', () => {
  it('deletes by trip_id', async () => {
    const { sb, chain } = makeSb({ data: null, error: null })
    await deleteNotes(sb, 'leg-1')
    expect(sb.from).toHaveBeenCalledWith('trip_notes')
    expect(chain.eq).toHaveBeenCalledWith('trip_id', 'leg-1')
  })

  it('propagates errors', async () => {
    const err = { message: 'delete failed' }
    const { sb } = makeSb({ data: null, error: err })
    expect(await deleteNotes(sb, 'leg-1')).toEqual({ error: err })
  })
})
