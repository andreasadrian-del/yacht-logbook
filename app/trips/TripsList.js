'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDuration(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ── Swipeable leg row ──────────────────────────────────────────────
function LegRow({ leg, tripId, isFirst, onDelete }) {
  const [offsetX, setOffsetX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const isHorizontal = useRef(false)
  const REVEAL_THRESHOLD = 60
  const DELETE_BTN_WIDTH = 80

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isHorizontal.current = false
    setIsDragging(true)
  }

  function onTouchMove(e) {
    if (touchStartX.current === null) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    if (!isHorizontal.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      isHorizontal.current = Math.abs(dx) > Math.abs(dy)
      if (!isHorizontal.current) return
    }
    e.preventDefault()
    setOffsetX(Math.min(0, Math.max(-DELETE_BTN_WIDTH, dx)))
  }

  function onTouchEnd() {
    setIsDragging(false)
    setOffsetX(offsetX < -REVEAL_THRESHOLD ? -DELETE_BTN_WIDTH : 0)
    touchStartX.current = null
  }

  const href = tripId ? `/legs/${leg.id}?from=${tripId}` : `/legs/${leg.id}`

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderTop: isFirst ? 'none' : '1px solid #f1f3f4' }}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: DELETE_BTN_WIDTH, background: '#ea4335', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={() => onDelete(leg)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', height: '100%' }}>
          Delete
        </button>
      </div>
      <Link
        href={href}
        onClick={e => { if (offsetX !== 0) { e.preventDefault(); setOffsetX(0) } }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', textDecoration: 'none', background: '#fff',
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s ease',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#202124' }}>
              {formatDate(leg.started_at)}
            </p>
            {!leg.ended_at && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#ea4335', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ea4335', display: 'inline-block' }} />
                Recording
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 3 }}>
            <span style={{ fontSize: 13, color: '#5f6368' }}>{leg.distance_nm != null ? `${leg.distance_nm.toFixed(1)} NM` : '— NM'}</span>
            <span style={{ fontSize: 13, color: '#5f6368' }}>{leg.ended_at ? formatDuration(leg.duration_seconds) : 'In progress'}</span>
            {leg.distance_nm != null && leg.duration_seconds > 0 && (
              <span style={{ fontSize: 13, color: '#5f6368' }}>{(leg.distance_nm / (leg.duration_seconds / 3600)).toFixed(1)} kn avg</span>
            )}
          </div>
        </div>
        <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
          <path d="M1 1l6 5.5L1 12" stroke="#c7c7cc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Link>
    </div>
  )
}

// ── Trip header card (named trip) ─────────────────────────────────
function TripCard({ trip, legs, onDeleteTrip }) {
  const totalNm = legs.reduce((s, l) => s + (l.distance_nm ?? 0), 0)
  const totalSeconds = legs.reduce((s, l) => s + (l.duration_seconds ?? 0), 0)

  return (
    <div style={{ marginBottom: 20 }}>
      <Link
        href={`/trips/${trip.id}`}
        style={{ display: 'block', textDecoration: 'none', background: '#1a73e8', borderRadius: '16px 16px 0 0', padding: '14px 16px' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#fff' }}>{trip.name}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                {legs.length} {legs.length === 1 ? 'leg' : 'legs'}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                {totalNm > 0 ? `${totalNm.toFixed(1)} NM` : '— NM'}
              </span>
              {totalSeconds > 0 && (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                  {formatDuration(totalSeconds)}
                </span>
              )}
            </div>
          </div>
          <svg width="8" height="13" viewBox="0 0 8 13" fill="none" style={{ marginTop: 4, flexShrink: 0 }}>
            <path d="M1 1l6 5.5L1 12" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </Link>

      {legs.length > 0 ? (
        <div style={{ background: '#fff', borderRadius: '0 0 16px 16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {legs.map((leg, i) => (
            <LegRow key={leg.id} leg={leg} tripId={trip.id} isFirst={i === 0} onDelete={() => {}} />
          ))}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '0 0 16px 16px', padding: '14px 16px', fontSize: 13, color: '#9aa0a6', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          No legs in this date range yet.
        </div>
      )}
    </div>
  )
}

// ── Create Trip modal ─────────────────────────────────────────────
function CreateTripModal({ onClose, onCreated }) {
  const [step, setStep] = useState('name') // 'name' | 'dates'
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim() || !startDate || !endDate) return
    if (endDate < startDate) { setError('End date must be after start date.'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('trips').insert({
      user_id: user.id,
      name: name.trim(),
      start_date: startDate,
      end_date: endDate,
    })
    if (err) { setError('Could not save trip.'); setSaving(false); return }
    onCreated()
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: '28px 20px', maxWidth: 340, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>

        {step === 'name' && (
          <>
            <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#202124', textAlign: 'center' }}>New Trip</p>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#5f6368', textAlign: 'center' }}>Give this trip a name</p>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) setStep('dates') }}
              placeholder="e.g. Croatia 2025"
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1px solid #e8eaed', fontSize: 15, outline: 'none', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid #e8eaed', background: '#fff', color: '#202124', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={() => name.trim() && setStep('dates')}
                disabled={!name.trim()}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: name.trim() ? '#1a73e8' : '#dadce0', color: name.trim() ? '#fff' : '#9aa0a6', fontSize: 15, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'default' }}
              >
                Next
              </button>
            </div>
          </>
        )}

        {step === 'dates' && (
          <>
            <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#202124', textAlign: 'center' }}>{name}</p>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#5f6368', textAlign: 'center' }}>Select the date range</p>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1px solid #e8eaed', fontSize: 15, outline: 'none', marginBottom: 14 }}
            />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>End date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1px solid #e8eaed', fontSize: 15, outline: 'none', marginBottom: error ? 8 : 16 }}
            />
            {error && <p style={{ margin: '0 0 12px', fontSize: 13, color: '#ea4335', textAlign: 'center' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setStep('name'); setError('') }} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid #e8eaed', background: '#fff', color: '#202124', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !startDate || !endDate}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: saving || !startDate || !endDate ? '#dadce0' : '#1a73e8', color: saving || !startDate || !endDate ? '#9aa0a6' : '#fff', fontSize: 15, fontWeight: 600, cursor: saving || !startDate || !endDate ? 'default' : 'pointer' }}
              >
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

// ── Main list ─────────────────────────────────────────────────────
export default function TripsList({ trips, legs, onRefresh }) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [confirmLeg, setConfirmLeg] = useState(null)
  const [warnLeg, setWarnLeg] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Group legs under trips (first matching trip by created_at wins)
  const sortedTrips = [...trips].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const assignedLegIds = new Set()

  const grouped = sortedTrips.map(trip => {
    const tripLegs = legs.filter(leg => {
      if (assignedLegIds.has(leg.id)) return false
      const d = leg.started_at.slice(0, 10)
      return d >= trip.start_date && d <= trip.end_date
    })
    tripLegs.forEach(l => assignedLegIds.add(l.id))
    return { trip, legs: tripLegs }
  }).sort((a, b) => new Date(b.trip.start_date) - new Date(a.trip.start_date))

  const standAloneLegs = legs.filter(l => !assignedLegIds.has(l.id))

  function handleDeleteLegRequest(leg) {
    if (!leg.ended_at) { setWarnLeg(leg); return }
    setConfirmLeg(leg)
  }

  async function confirmDeleteLeg() {
    if (!confirmLeg) return
    setDeleting(true)
    const id = confirmLeg.id
    await supabase.from('track_points').delete().eq('trip_id', id)
    await supabase.from('logbook_entries').delete().eq('trip_id', id)
    await supabase.from('trip_notes').delete().eq('trip_id', id)
    await supabase.from('legs').delete().eq('id', id)
    setConfirmLeg(null)
    setDeleting(false)
    onRefresh()
  }

  const totalLegs = legs.length

  return (
    <>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {totalLegs} {totalLegs === 1 ? 'Leg' : 'Legs'}
        </p>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{ padding: '8px 16px', borderRadius: 20, border: 'none', background: '#1a73e8', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + Create Trip
        </button>
      </div>

      {/* Named trips */}
      {grouped.map(({ trip, legs: tripLegs }) => (
        <TripCard key={trip.id} trip={trip} legs={tripLegs} onDeleteTrip={() => {}} />
      ))}

      {/* Standalone legs */}
      {standAloneLegs.length > 0 && (
        <>
          {grouped.length > 0 && (
            <p style={{ fontSize: 12, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 0 10px' }}>
              Unassigned Legs
            </p>
          )}
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {standAloneLegs.map((leg, i) => (
              <LegRow key={leg.id} leg={leg} tripId={null} isFirst={i === 0} onDelete={handleDeleteLegRequest} />
            ))}
          </div>
        </>
      )}

      {totalLegs === 0 && grouped.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 48, margin: '0 0 12px' }}>🗺️</p>
          <p style={{ fontSize: 17, fontWeight: 600, color: '#202124', margin: '0 0 6px' }}>No legs yet</p>
          <p style={{ fontSize: 14, color: '#5f6368', margin: 0 }}>Start tracking from the Tracking tab.</p>
        </div>
      )}

      {/* Create trip modal */}
      {showCreateModal && (
        <CreateTripModal
          onClose={() => setShowCreateModal(false)}
          onCreated={onRefresh}
        />
      )}

      {/* Warn: live leg cannot be deleted */}
      {warnLeg && (
        <div onClick={() => setWarnLeg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: '28px 20px', maxWidth: 320, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#202124', textAlign: 'center' }}>Leg Still Recording</p>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#5f6368', textAlign: 'center', lineHeight: 1.5 }}>
              This leg is currently active. Stop it on the Tracking tab before deleting.
            </p>
            <button onClick={() => setWarnLeg(null)} style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', background: '#1a73e8', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* Confirm delete leg */}
      {confirmLeg && (
        <div onClick={() => !deleting && setConfirmLeg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: '28px 20px', maxWidth: 320, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#202124', textAlign: 'center' }}>Delete Leg?</p>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#5f6368', textAlign: 'center', lineHeight: 1.5 }}>
              {formatDate(confirmLeg.started_at)} — this will permanently delete all track points and log entries.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmLeg(null)} disabled={deleting} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid #e8eaed', background: '#fff', color: '#202124', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={confirmDeleteLeg} disabled={deleting} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: deleting ? '#dadce0' : '#ea4335', color: '#fff', fontSize: 15, fontWeight: 600, cursor: deleting ? 'wait' : 'pointer' }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
