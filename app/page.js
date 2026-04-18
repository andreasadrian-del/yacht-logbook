'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import LiveMap from './LiveMap'
import WayLogIcon from './WayLogIcon'
import BottomNav from './BottomNav'
import { useTripContext } from './TripContext'

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
  const { isTracking, tripId, tripStartTime, startTrip, endTrip, setCurrentPosition } = useTripContext()

  const [splash, setSplash] = useState(() =>
    typeof window !== 'undefined' ? !sessionStorage.getItem('splashShown') : false
  )
  const [splashFading, setSplashFading] = useState(false)
  const [position, setPosition] = useState(null)
  const [initialMapCenter] = useState(() => {
    if (typeof window === 'undefined') return null
    const lat = parseFloat(localStorage.getItem('lastLat'))
    const lng = parseFloat(localStorage.getItem('lastLng'))
    return isNaN(lat) || isNaN(lng) ? null : { lat, lng }
  })
  const [trackPoints, setTrackPoints] = useState([])
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
  const lastRecordedRef = useRef(0)
  const distanceRef = useRef(0)
  const wakeLockRef = useRef(null)

  useEffect(() => {
    if (!splash) return
    sessionStorage.setItem('splashShown', '1')
    const fadeTimer = setTimeout(() => setSplashFading(true), 800)
    const hideTimer = setTimeout(() => setSplash(false), 1200)
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
  }, [splash])

  // Get a position fix on open so the map zooms in immediately, even without an active trip
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        localStorage.setItem('lastLat', latitude)
        localStorage.setItem('lastLng', longitude)
        setPosition(prev => prev ?? { lat: latitude, lng: longitude, speed: null, course: null, accuracy: pos.coords.accuracy })
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
      if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      wakeLockRef.current?.release()
    }
  }, [])

  const uploadPending = useCallback(async () => {
    if (!pendingPointsRef.current.length || !tripIdRef.current) return
    const batch = pendingPointsRef.current.splice(0)
    const { error } = await supabase.from('track_points').insert(
      batch.map(p => ({ trip_id: tripIdRef.current, recorded_at: p.timestamp, lat: p.lat, lng: p.lng, speed: p.speed, course: p.course }))
    )
    if (error) { console.error('Upload error:', error.message); return }
    const last = batch[batch.length - 1]
    await supabase.from('trips').update({ last_lat: last.lat, last_lng: last.lng }).eq('id', tripIdRef.current)
  }, [])

  const handleGpsUpdate = useCallback((pos) => {
    const { latitude, longitude, speed, heading, accuracy } = pos.coords
    if (accuracy > 50) return

    const speedKnots = speed != null ? speed * 1.94384 : null
    setPosition({ lat: latitude, lng: longitude, speed: speedKnots, course: heading, accuracy })
    setCurrentPosition({ lat: latitude, lng: longitude })
    localStorage.setItem('lastLat', latitude)
    localStorage.setItem('lastLng', longitude)

    const now = Date.now()
    if (now - lastRecordedRef.current < 30000) return
    lastRecordedRef.current = now

    const point = {
      lat: latitude, lng: longitude,
      speed: speedKnots != null ? Math.round(speedKnots * 10) / 10 : null,
      course: heading != null ? Math.round(heading) : null,
      timestamp: new Date(pos.timestamp).toISOString(),
    }
    pendingPointsRef.current.push(point)
    setTrackPoints(prev => [...prev, { lat: latitude, lng: longitude }])

    if (lastPositionRef.current) {
      distanceRef.current += haversineNm(lastPositionRef.current.lat, lastPositionRef.current.lng, latitude, longitude)
      setDistanceNm(Math.round(distanceRef.current * 100) / 100)
    }
    lastPositionRef.current = { lat: latitude, lng: longitude }
  }, [setCurrentPosition])

  const startWatching = useCallback(() => {
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000)
    uploadIntervalRef.current = setInterval(uploadPending, 30000)
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleGpsUpdate,
      (err) => { setStatus('error'); setStatusMsg('GPS error: ' + err.message) },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [uploadPending, handleGpsUpdate])

  // Restore tracking state when returning to this tab mid-trip
  useEffect(() => {
    if (isTracking !== true || !tripId || watchIdRef.current) return
    tripIdRef.current = tripId
    startTimeRef.current = tripStartTime || Date.now()
    setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    lastRecordedRef.current = 0

    // Reload existing track points so the polyline is fully drawn
    supabase
      .from('track_points')
      .select('lat, lng')
      .eq('trip_id', tripId)
      .order('recorded_at')
      .then(({ data }) => {
        if (!data?.length) return
        const pts = data.map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng) }))
        setTrackPoints(pts)
        const last = pts[pts.length - 1]
        lastPositionRef.current = { lat: last.lat, lng: last.lng }
        let dist = 0
        for (let i = 1; i < pts.length; i++) {
          dist += haversineNm(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng)
        }
        distanceRef.current = dist
        setDistanceNm(Math.round(dist * 100) / 100)
      })

    startWatching()
  }, [isTracking, tripId, tripStartTime, startWatching])

  const acquireWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
    } catch (_) {}
  }, [])

  // On screen unlock: re-acquire wake lock, correct elapsed, force-record next GPS fix
  useEffect(() => {
    if (!isTracking) return
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && startTimeRef.current) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
        lastRecordedRef.current = 0
        acquireWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isTracking, acquireWakeLock])

  const startTripHandler = async () => {
    if (!navigator.geolocation) { setStatus('error'); setStatusMsg('GPS not available.'); return }
    setStatus('uploading'); setStatusMsg('Creating trip…')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatus('error'); setStatusMsg('Not signed in.'); return }

    const { data, error } = await supabase
      .from('trips')
      .insert({ started_at: new Date().toISOString(), user_id: user.id })
      .select('id').single()
    if (error) { setStatus('error'); setStatusMsg('Could not create trip.'); return }

    tripIdRef.current = data.id
    startTimeRef.current = Date.now()
    lastPositionRef.current = null
    distanceRef.current = 0; pendingPointsRef.current = []; lastRecordedRef.current = 0
    setDistanceNm(0); setElapsed(0); setPosition(null); setTrackPoints([])

    startTrip(data.id) // persists to localStorage
    startWatching()
    acquireWakeLock()
    setStatus('tracking'); setStatusMsg('')
  }

  const stopTripHandler = async () => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
    if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    watchIdRef.current = null
    wakeLockRef.current?.release(); wakeLockRef.current = null
    setStatus('uploading'); setStatusMsg('Saving trip…')
    await uploadPending()
    await supabase.from('trips').update({
      ended_at: new Date().toISOString(),
      duration_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
      distance_nm: Math.round(distanceRef.current * 100) / 100,
      ...(lastPositionRef.current && {
        last_lat: lastPositionRef.current.lat,
        last_lng: lastPositionRef.current.lng,
      }),
    }).eq('id', tripIdRef.current)
    endTrip()
    tripIdRef.current = null
    setStatus('idle'); setStatusMsg('')
  }

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
            {status === 'uploading' ? 'Saving…' : tracking ? '⏹  Stop Trip' : '▶  Start Trip'}
          </button>

        </div>
      </div>

      <BottomNav />
    </div>
  )
}
