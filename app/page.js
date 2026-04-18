'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LiveMap from './LiveMap'
import WayLogIcon from './WayLogIcon'

// ── helpers ──────────────────────────────────────────────────────────────────

function haversineNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function cogToCompass(deg) {
  if (deg == null) return ''
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(deg / 45) % 8]
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      flex: 1,
      background: '#fff',
      border: '1px solid #e8eaed',
      borderRadius: 12,
      padding: '14px 8px',
      textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#202124', lineHeight: 1.1 }}>
        {value}
      </p>
      {sub && (
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#1a73e8', fontWeight: 500 }}>{sub}</p>
      )}
      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </p>
    </div>
  )
}

function BottomNav() {
  const pathname = usePathname()
  const active = '#1a73e8'
  const inactive = '#9aa0a6'

  const tabs = [
    {
      href: '/',
      label: 'Tracking',
      icon: (c) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" fill={c}/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={c} strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="7" stroke={c} strokeWidth="1.5" strokeDasharray="2 3"/>
        </svg>
      ),
    },
    {
      href: '/trips',
      label: 'All Trips',
      icon: (c) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="16" rx="2" stroke={c} strokeWidth="1.8"/>
          <path d="M7 9h10M7 13h6" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{
      display: 'flex',
      borderTop: '1px solid #e8eaed',
      background: '#fff',
      flexShrink: 0,
    }}>
      {tabs.map(tab => {
        const isActive = pathname === tab.href
        const color = isActive ? active : inactive
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '10px 0 18px', textDecoration: 'none', gap: 3,
            }}
          >
            {tab.icon(color)}
            <span style={{ fontSize: 10, color, fontWeight: isActive ? 600 : 400 }}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function TrackingPage() {
  const [splash, setSplash] = useState(true)
  const [splashFading, setSplashFading] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [position, setPosition] = useState(null)
  const [trackPoints, setTrackPoints] = useState([])
  const [pointCount, setPointCount] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [distanceNm, setDistanceNm] = useState(0)
  const [status, setStatus] = useState('idle')
  const [statusMsg, setStatusMsg] = useState('')

  const watchIdRef = useRef(null)
  const uploadIntervalRef = useRef(null)
  const timerRef = useRef(null)
  const pendingPointsRef = useRef([])
  const tripIdRef = useRef(null)
  const startTimeRef = useRef(null)
  const lastPositionRef = useRef(null)
  const distanceRef = useRef(0)
  const pointCountRef = useRef(0)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFading(true), 800)
    const hideTimer = setTimeout(() => setSplash(false), 1200)
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
  }, [])

  useEffect(() => {
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
      if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const uploadPending = useCallback(async () => {
    if (!pendingPointsRef.current.length || !tripIdRef.current) return
    const batch = pendingPointsRef.current.splice(0)
    const { error } = await supabase.from('track_points').insert(
      batch.map(p => ({ trip_id: tripIdRef.current, recorded_at: p.timestamp, lat: p.lat, lng: p.lng, speed: p.speed, course: p.course }))
    )
    if (error) console.error('Upload error:', error.message)
  }, [])

  const startTrip = async () => {
    if (!navigator.geolocation) { setStatus('error'); setStatusMsg('GPS not available.'); return }
    setStatus('uploading'); setStatusMsg('Creating trip…')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatus('error'); setStatusMsg('Not signed in.'); return }

    const { data, error } = await supabase.from('trips').insert({ started_at: new Date().toISOString(), user_id: user.id }).select('id').single()
    if (error) { setStatus('error'); setStatusMsg('Could not create trip.'); return }

    tripIdRef.current = data.id
    startTimeRef.current = Date.now()
    lastPositionRef.current = null
    distanceRef.current = 0; pointCountRef.current = 0; pendingPointsRef.current = []
    setDistanceNm(0); setPointCount(0); setElapsed(0); setPosition(null); setTrackPoints([])

    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000)
    uploadIntervalRef.current = setInterval(uploadPending, 15000)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading, accuracy } = pos.coords
        if (accuracy > 50) return

        const speedKnots = speed != null ? speed * 1.94384 : null
        const point = { lat: latitude, lng: longitude, speed: speedKnots != null ? Math.round(speedKnots * 10) / 10 : null, course: heading != null ? Math.round(heading) : null, timestamp: new Date(pos.timestamp).toISOString() }

        pendingPointsRef.current.push(point)
        pointCountRef.current += 1
        setPointCount(pointCountRef.current)
        setTrackPoints(prev => [...prev, { lat: latitude, lng: longitude }])

        if (lastPositionRef.current) {
          distanceRef.current += haversineNm(lastPositionRef.current.lat, lastPositionRef.current.lng, latitude, longitude)
          setDistanceNm(Math.round(distanceRef.current * 100) / 100)
        }
        lastPositionRef.current = { lat: latitude, lng: longitude }
        setPosition({ lat: latitude, lng: longitude, speed: speedKnots, course: heading, accuracy })
      },
      (err) => { setStatus('error'); setStatusMsg('GPS error: ' + err.message) },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    setIsTracking(true); setStatus('tracking'); setStatusMsg('')
  }

  const stopTrip = async () => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
    if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    setStatus('uploading'); setStatusMsg('Saving trip…')
    await uploadPending()
    await supabase.from('trips').update({ ended_at: new Date().toISOString(), duration_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000) }).eq('id', tripIdRef.current)
    tripIdRef.current = null
    setIsTracking(false); setStatus('idle'); setStatusMsg('')
  }

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', background: '#f8f9fa', fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>

      {/* Splash screen */}
      {splash && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#fff',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          opacity: splashFading ? 0 : 1,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none',
        }}>
          <WayLogIcon size={110} showText instanceId="splash" />
        </div>
      )}

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e8eaed', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', gap: 10 }}>
          <WayLogIcon size={28} instanceId="header" />
          <span style={{ fontSize: 18, fontWeight: 700, color: '#202124', letterSpacing: '-0.3px' }}>Way Log</span>
          <button
            onClick={() => supabase.auth.signOut().then(() => { window.location.href = '/login' })}
            style={{ marginLeft: 'auto', fontSize: 13, color: '#5f6368', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 24px' }}>

          {/* Status message */}
          {statusMsg && (
            <div style={{
              marginBottom: 16, padding: '10px 16px', borderRadius: 8, fontSize: 13, textAlign: 'center',
              background: status === 'error' ? '#fce8e6' : '#e8f0fe',
              color: status === 'error' ? '#ea4335' : '#1a73e8',
            }}>
              {statusMsg}
            </div>
          )}

          {/* Elapsed timer */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 48, fontWeight: 300, color: isTracking ? '#202124' : '#dadce0', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
              {formatElapsed(elapsed)}
            </p>
            {isTracking && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 12, fontWeight: 500, color: '#ea4335', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ea4335', display: 'inline-block' }} />
                Recording
              </span>
            )}
          </div>

          {/* Stat cards */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
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
              label="SOG"
              value={position?.speed != null ? position.speed.toFixed(1) : '—'}
              sub={position?.speed != null ? 'knots' : null}
            />
          </div>

          {/* Map */}
          <div style={{
            position: 'relative', height: 280, borderRadius: 16, overflow: 'hidden',
            border: '1px solid #e8eaed', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            marginBottom: 20, background: '#e8f0fe',
          }}>
            <LiveMap trackPoints={trackPoints} currentPosition={position} />
            {/* GPS accuracy chip */}
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

          {/* Point count */}
          {isTracking && (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#9aa0a6', margin: '0 0 16px' }}>
              {pointCount} GPS {pointCount === 1 ? 'point' : 'points'} recorded
            </p>
          )}

          {/* Start / Stop button */}
          <button
            onClick={isTracking ? stopTrip : startTrip}
            disabled={status === 'uploading'}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 28, border: 'none',
              fontSize: 16, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.01em',
              background: status === 'uploading' ? '#dadce0' : isTracking ? '#ea4335' : '#1a73e8',
              color: status === 'uploading' ? '#9aa0a6' : '#fff',
              boxShadow: status === 'uploading' ? 'none' : '0 2px 6px rgba(0,0,0,0.2)',
              transition: 'background 0.2s, box-shadow 0.2s',
            }}
          >
            {status === 'uploading' ? 'Saving…' : isTracking ? '⏹  Stop Trip' : '▶  Start Trip'}
          </button>

        </div>
      </div>

      {/* Bottom nav */}
      <BottomNav />
    </div>
  )
}
