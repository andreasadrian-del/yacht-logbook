'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import LiveMap from './LiveMap'
import WayLogIcon from './WayLogIcon'
import BottomNav from './BottomNav'
import { useTripContext } from './TripContext'
import { useGpsTracking } from './useGpsTracking'

const EVENTS = ['TACK', 'JIBE', 'REEF', 'UNREEF', 'ENGINE ON', 'ENGINE OFF']

const EVENT_STYLE = {
  TACK:       { color: '#1a73e8', bg: '#e8f0fe', border: '#1a73e8' },
  JIBE:       { color: '#1a73e8', bg: '#e8f0fe', border: '#1a73e8' },
  REEF:       { color: '#f29900', bg: '#fef7e0', border: '#f29900' },
  UNREEF:     { color: '#34a853', bg: '#e6f4ea', border: '#34a853' },
  'ENGINE ON':  { color: '#34a853', bg: '#e6f4ea', border: '#34a853' },
  'ENGINE OFF': { color: '#ea4335', bg: '#fce8e6', border: '#ea4335' },
}

function cogToCompass(deg) {
  if (deg == null) return ''
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(deg / 45) % 8]
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="#34a853" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e8eaed', borderRadius: 14,
      padding: '16px 10px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#202124', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      {sub && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#1a73e8', fontWeight: 500 }}>{sub}</p>}
      <p style={{ margin: sub ? '2px 0 0' : '6px 0 0', fontSize: 11, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </p>
    </div>
  )
}

export default function TrackingPage() {
  const tripContext = useTripContext()
  const { isTracking, tripId, currentPosition } = tripContext

  const [splash, setSplash] = useState(() =>
    typeof window !== 'undefined' ? !sessionStorage.getItem('splashShown') : false
  )
  const [splashFading, setSplashFading] = useState(false)
  const [initialMapCenter] = useState(() => {
    if (typeof window === 'undefined') return null
    const lat = parseFloat(localStorage.getItem('lastLat'))
    const lng = parseFloat(localStorage.getItem('lastLng'))
    return isNaN(lat) || isNaN(lng) ? null : { lat, lng }
  })
  const [confirmed, setConfirmed] = useState(null)
  const [comment, setComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)
  const [commentSaved, setCommentSaved] = useState(false)
  const [showStopConfirm, setShowStopConfirm] = useState(false)

  useEffect(() => {
    if (!splash) return
    sessionStorage.setItem('splashShown', '1')
    const fadeTimer = setTimeout(() => setSplashFading(true), 800)
    const hideTimer = setTimeout(() => setSplash(false), 1200)
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
  }, [splash])

  const { position, trackPoints, elapsed, distanceNm, status, statusMsg, startTripHandler, stopTripHandler } =
    useGpsTracking(tripContext)

  const tracking = isTracking === true

  async function logEvent(type) {
    if (!tracking) return
    await supabase.from('logbook_entries').insert({
      trip_id: tripId,
      event_type: type.toLowerCase(),
      recorded_at: new Date().toISOString(),
      lat: currentPosition?.lat ?? null,
      lng: currentPosition?.lng ?? null,
    })
    setConfirmed(type)
    setTimeout(() => setConfirmed(null), 1500)
  }

  async function saveComment() {
    if (!comment.trim() || !tracking) return
    setSavingComment(true)
    await supabase.from('logbook_entries').insert({
      trip_id: tripId,
      event_type: 'comment',
      comment: comment.trim(),
      recorded_at: new Date().toISOString(),
      lat: currentPosition?.lat ?? null,
      lng: currentPosition?.lng ?? null,
    })
    setSavingComment(false)
    setComment('')
    setCommentSaved(true)
    setTimeout(() => setCommentSaved(false), 1500)
  }

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', background: '#f8f9fa', fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>

      {splash && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: splashFading ? 0 : 1, transition: 'opacity 0.4s ease', pointerEvents: 'none',
        }}>
          <WayLogIcon size={110} showText instanceId="splash" />
        </div>
      )}

      <header style={{ background: '#fff', borderBottom: '1px solid #e8eaed', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', gap: 10 }}>
          <WayLogIcon size={28} instanceId="header" />
          <span style={{ fontSize: 18, fontWeight: 700, color: '#202124', letterSpacing: '-0.3px' }}>Logbook Nadira</span>
          <button
            onClick={() => supabase.auth.signOut().then(() => { window.location.href = '/login' })}
            style={{ marginLeft: 'auto', fontSize: 13, color: '#5f6368', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 24px' }}>

          {statusMsg && (
            <div style={{
              marginBottom: 16, padding: '10px 16px', borderRadius: 8, fontSize: 13, textAlign: 'center',
              background: status === 'error' ? '#fce8e6' : '#e8f0fe',
              color: status === 'error' ? '#ea4335' : '#1a73e8',
            }}>
              {statusMsg}
            </div>
          )}

          {tracking && (
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: '#ea4335', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ea4335', display: 'inline-block' }} />
                Recording
              </span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <StatCard
              label="SOG"
              value={position?.speed != null ? position.speed.toFixed(1) : '—'}
              sub={position?.speed != null ? 'knots' : null}
            />
            <StatCard
              label="COG"
              value={position?.course != null ? `${Math.round(position.course)}°` : '—'}
              sub={position?.course != null ? cogToCompass(position.course) : null}
            />
            <StatCard label="NM" value={distanceNm.toFixed(2)} sub={distanceNm > 0 ? 'nautical mi' : null} />
            <StatCard label="TIME" value={`${Math.floor(elapsed / 60)} min`} />
          </div>

          <div style={{
            background: '#fff', border: '1px solid #e8eaed', borderRadius: 14,
            padding: '12px 16px', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <p style={{ margin: 0, fontSize: 11, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0, marginRight: 12 }}>Position</p>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#202124', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
              {position
                ? `${Math.abs(position.lat).toFixed(4)}°${position.lat >= 0 ? 'N' : 'S'}   ${Math.abs(position.lng).toFixed(4)}°${position.lng >= 0 ? 'E' : 'W'}`
                : '—'}
            </p>
          </div>

          <div style={{
            position: 'relative', height: 220, borderRadius: 16, overflow: 'hidden',
            border: '1px solid #e8eaed', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            marginBottom: 14, background: '#e8f0fe',
          }}>
            <LiveMap trackPoints={trackPoints} currentPosition={position} initialCenter={initialMapCenter} />
            {position && (
              <div style={{
                position: 'absolute', bottom: 10, right: 10, zIndex: 1000,
                background: 'rgba(255,255,255,0.92)', borderRadius: 20, padding: '3px 10px',
                fontSize: 11, color: '#5f6368', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: position.accuracy <= 10 ? '#34a853' : position.accuracy <= 30 ? '#fbbc04' : '#ea4335' }} />
                ±{Math.round(position.accuracy)}m
              </div>
            )}
          </div>

          {/* Log events — only when recording */}
          {tracking && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Log Event
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                {EVENTS.map(type => {
                  const s = EVENT_STYLE[type]
                  const isConfirmed = confirmed === type
                  return (
                    <button
                      key={type}
                      onClick={() => logEvent(type)}
                      style={{
                        padding: '12px 4px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s',
                        background: isConfirmed ? '#e6f4ea' : s.bg,
                        color: isConfirmed ? '#34a853' : s.color,
                        border: `1.5px solid ${isConfirmed ? '#34a853' : s.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}
                    >
                      {isConfirmed ? <><CheckIcon /> Saved</> : type}
                    </button>
                  )
                })}
              </div>

              {/* Comment */}
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Add a comment…"
                  rows={2}
                  style={{
                    flex: 1, borderRadius: 10, border: '1px solid #e8eaed', padding: '8px 10px',
                    fontSize: 14, resize: 'none', fontFamily: 'inherit', color: '#202124', outline: 'none',
                  }}
                />
                <button
                  onClick={saveComment}
                  disabled={savingComment || !comment.trim()}
                  style={{
                    padding: '0 14px', borderRadius: 10, border: 'none', flexShrink: 0,
                    background: commentSaved ? '#e6f4ea' : savingComment || !comment.trim() ? '#dadce0' : '#1a73e8',
                    color: commentSaved ? '#34a853' : savingComment || !comment.trim() ? '#9aa0a6' : '#fff',
                    fontSize: 13, fontWeight: 600, cursor: !comment.trim() ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {commentSaved ? <><CheckIcon /> Saved</> : savingComment ? '…' : 'Save'}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={tracking ? () => setShowStopConfirm(true) : startTripHandler}
            disabled={status === 'uploading'}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 28, border: 'none',
              fontSize: 16, fontWeight: 600, cursor: status === 'uploading' ? 'wait' : 'pointer',
              background: status === 'uploading' ? '#dadce0' : tracking ? '#ea4335' : '#1a73e8',
              color: status === 'uploading' ? '#9aa0a6' : '#fff',
              boxShadow: status === 'uploading' ? 'none' : '0 2px 6px rgba(0,0,0,0.2)',
              transition: 'background 0.2s, box-shadow 0.2s',
            }}
          >
            {status === 'uploading' ? 'Saving…' : tracking ? '⏹  Stop Leg' : '▶  Start Leg'}
          </button>

        </div>
      </div>

      {/* Stop confirmation modal */}
      {showStopConfirm && (
        <div
          onClick={() => setShowStopConfirm(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 20, padding: '28px 20px', maxWidth: 320, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
          >
            <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#202124', textAlign: 'center' }}>Stop Leg?</p>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#5f6368', textAlign: 'center', lineHeight: 1.5 }}>
              This will end the current leg and save all track data.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowStopConfirm(false)}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid #e8eaed', background: '#fff', color: '#202124', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowStopConfirm(false); stopTripHandler() }}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: '#ea4335', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                Stop Leg
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
