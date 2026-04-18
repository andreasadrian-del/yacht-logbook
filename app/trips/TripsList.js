'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatDuration(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function TripRow({ trip, isLast, onDelete }) {
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
    const clamped = Math.min(0, Math.max(-DELETE_BTN_WIDTH, dx))
    setOffsetX(clamped)
  }

  function onTouchEnd() {
    setIsDragging(false)
    if (offsetX < -REVEAL_THRESHOLD) {
      setOffsetX(-DELETE_BTN_WIDTH)
    } else {
      setOffsetX(0)
    }
    touchStartX.current = null
  }

  function close() {
    setOffsetX(0)
  }

  const revealed = offsetX <= -DELETE_BTN_WIDTH

  return (
    <div
      style={{ position: 'relative', overflow: 'hidden', borderTop: isLast ? 'none' : undefined }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Delete button behind */}
      <div
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: DELETE_BTN_WIDTH, background: '#ea4335',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <button
          onClick={() => onDelete(trip)}
          style={{
            background: 'none', border: 'none', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            width: '100%', height: '100%',
          }}
        >
          Delete
        </button>
      </div>

      {/* Row content */}
      <Link
        href={`/trips/${trip.id}`}
        onClick={e => { if (offsetX !== 0) { e.preventDefault(); close() } }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', textDecoration: 'none', background: '#fff',
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s ease',
          willChange: 'transform',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#202124' }}>
              {formatDate(trip.started_at)}
            </p>
            {!trip.ended_at && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#ea4335', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ea4335', display: 'inline-block' }} />
                Recording
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            <span style={{ fontSize: 13, color: '#5f6368' }}>
              {trip.distance_nm != null ? `${trip.distance_nm.toFixed(1)} NM` : '— NM'}
            </span>
            <span style={{ fontSize: 13, color: '#5f6368' }}>
              {trip.ended_at ? formatDuration(trip.duration_seconds) : 'In progress'}
            </span>
          </div>
          {(trip.last_lat != null && trip.last_lng != null) && (
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9aa0a6', fontVariantNumeric: 'tabular-nums' }}>
              {Math.abs(trip.last_lat).toFixed(4)}°{trip.last_lat >= 0 ? 'N' : 'S'}&nbsp;&nbsp;{Math.abs(trip.last_lng).toFixed(4)}°{trip.last_lng >= 0 ? 'E' : 'W'}
            </p>
          )}
        </div>
        <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
          <path d="M1 1l6 5.5L1 12" stroke="#c7c7cc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Link>
    </div>
  )
}

export default function TripsList({ initialTrips }) {
  const [trips, setTrips] = useState(initialTrips)
  const [confirmTrip, setConfirmTrip] = useState(null)
  const [warnTrip, setWarnTrip] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  function handleDeleteRequest(trip) {
    if (!trip.ended_at) { setWarnTrip(trip); return }
    setConfirmTrip(trip)
  }

  async function confirmDelete() {
    if (!confirmTrip) return
    setDeleting(true)
    const id = confirmTrip.id
    await supabase.from('track_points').delete().eq('trip_id', id)
    await supabase.from('logbook_entries').delete().eq('trip_id', id)
    await supabase.from('trips').delete().eq('id', id)
    setTrips(prev => prev.filter(t => t.id !== id))
    setConfirmTrip(null)
    setDeleting(false)
  }

  if (trips.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ fontSize: 48, margin: '0 0 12px' }}>🗺️</p>
        <p style={{ fontSize: 17, fontWeight: 600, color: '#202124', margin: '0 0 6px' }}>No trips yet</p>
        <p style={{ fontSize: 14, color: '#5f6368', margin: 0 }}>Start tracking from the Tracking tab.</p>
      </div>
    )
  }

  return (
    <>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
        {trips.length} {trips.length === 1 ? 'Trip' : 'Trips'}
      </p>
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {trips.map((trip, i) => (
          <div key={trip.id} style={{ borderTop: i > 0 ? '1px solid #f1f3f4' : 'none' }}>
            <TripRow trip={trip} isLast={i === 0} onDelete={handleDeleteRequest} />
          </div>
        ))}
      </div>

      {/* Warning modal — live trip cannot be deleted */}
      {warnTrip && (
        <div
          onClick={() => setWarnTrip(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 20, padding: '28px 20px', maxWidth: 320, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
          >
            <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#202124', textAlign: 'center' }}>
              Trip Still Recording
            </p>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#5f6368', textAlign: 'center', lineHeight: 1.5 }}>
              This trip is currently active. Stop the trip on the Tracking tab before deleting it.
            </p>
            <button
              onClick={() => setWarnTrip(null)}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                background: '#1a73e8', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmTrip && (
        <div
          onClick={() => !deleting && setConfirmTrip(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 20, padding: '28px 20px', maxWidth: 320, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
          >
            <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#202124', textAlign: 'center' }}>
              Delete Trip?
            </p>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#5f6368', textAlign: 'center', lineHeight: 1.5 }}>
              {formatDate(confirmTrip.started_at)} — this will permanently delete all track points and log entries.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmTrip(null)}
                disabled={deleting}
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid #e8eaed',
                  background: '#fff', color: '#202124', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 12, border: 'none',
                  background: deleting ? '#dadce0' : '#ea4335', color: '#fff',
                  fontSize: 15, fontWeight: 600, cursor: deleting ? 'wait' : 'pointer',
                }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
