'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import LiveMap from './LiveMap'
import WayLogIcon from './WayLogIcon'
import BottomNav from './BottomNav'
import { useTripContext } from './TripContext'
import { useGpsTracking } from './useGpsTracking'

function cogToCompass(deg) {
  if (deg == null) return ''
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(deg / 45) % 8]
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
  const { isTracking } = tripContext

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
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
            <StatCard
              label="NM"
              value={distanceNm.toFixed(2)}
              sub={distanceNm > 0 ? 'nautical mi' : null}
            />
            <StatCard
              label="TIME"
              value={`${Math.floor(elapsed / 60)} min`}
            />
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
            position: 'relative', height: 260, borderRadius: 16, overflow: 'hidden',
            border: '1px solid #e8eaed', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            marginBottom: 20, background: '#e8f0fe',
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

          <button
            onClick={tracking ? stopTripHandler : startTripHandler}
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

      <BottomNav />
    </div>
  )
}
