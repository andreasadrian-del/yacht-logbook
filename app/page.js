'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import LiveMap from './LiveMap'

function haversineNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TrackingPage() {
  const [isTracking, setIsTracking] = useState(false)
  const [position, setPosition] = useState(null)       // { lat, lng, speed, course, accuracy } — raw numbers
  const [trackPoints, setTrackPoints] = useState([])   // [{lat, lng}] for the live map
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
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
      if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const uploadPending = useCallback(async () => {
    if (!pendingPointsRef.current.length || !tripIdRef.current) return
    const batch = pendingPointsRef.current.splice(0)
    const rows = batch.map(p => ({
      trip_id: tripIdRef.current,
      recorded_at: p.timestamp,
      lat: p.lat,
      lng: p.lng,
      speed: p.speed,
      course: p.course,
    }))
    const { error } = await supabase.from('track_points').insert(rows)
    if (error) console.error('Upload error:', error.message)
  }, [])

  const startTrip = async () => {
    if (!navigator.geolocation) {
      setStatus('error'); setStatusMsg('GPS not available on this device.'); return
    }
    setStatus('uploading'); setStatusMsg('Creating trip…')

    const { data, error } = await supabase
      .from('trips').insert({ started_at: new Date().toISOString() }).select('id').single()

    if (error) {
      setStatus('error'); setStatusMsg('Could not create trip: ' + error.message); return
    }

    tripIdRef.current = data.id
    startTimeRef.current = Date.now()
    lastPositionRef.current = null
    distanceRef.current = 0
    pointCountRef.current = 0
    pendingPointsRef.current = []

    setDistanceNm(0); setPointCount(0); setElapsed(0); setPosition(null); setTrackPoints([])

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    uploadIntervalRef.current = setInterval(uploadPending, 15000)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading, accuracy } = pos.coords
        if (accuracy > 50) return

        const speedKnots = speed != null ? speed * 1.94384 : null
        const point = {
          lat: latitude, lng: longitude,
          speed: speedKnots != null ? Math.round(speedKnots * 10) / 10 : null,
          course: heading != null ? Math.round(heading) : null,
          timestamp: new Date(pos.timestamp).toISOString(),
        }

        pendingPointsRef.current.push(point)
        pointCountRef.current += 1
        setPointCount(pointCountRef.current)
        setTrackPoints(prev => [...prev, { lat: latitude, lng: longitude }])

        if (lastPositionRef.current) {
          const d = haversineNm(lastPositionRef.current.lat, lastPositionRef.current.lng, latitude, longitude)
          distanceRef.current += d
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

    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
    await supabase.from('trips')
      .update({ ended_at: new Date().toISOString(), duration_seconds: durationSeconds })
      .eq('id', tripIdRef.current)

    tripIdRef.current = null
    setIsTracking(false); setStatus('idle'); setStatusMsg('')
  }

  const accuracyColor = position
    ? position.accuracy <= 10 ? '#34C759' : position.accuracy <= 30 ? '#FF9500' : '#FF3B30'
    : '#C7C7CC'

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', background: '#0a1628' }}>

      {/* Nav bar */}
      <header style={{ background: '#0a1628', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>⚓</span>
            <span style={{ fontWeight: 600, fontSize: 17, color: 'white' }}>Yacht Logbook</span>
          </div>
          <Link href="/trips" style={{ color: '#007AFF', fontSize: 15, textDecoration: 'none' }}>All Trips</Link>
        </div>
      </header>

      {/* Map — fills available space */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <LiveMap trackPoints={trackPoints} currentPosition={position} />

        {/* Status pill overlaid on map */}
        {statusMsg && (
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000, background: status === 'error' ? '#FF3B30' : '#007AFF',
            color: 'white', fontSize: 13, padding: '6px 16px', borderRadius: 20,
            whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            {statusMsg}
          </div>
        )}

        {/* GPS accuracy badge */}
        {position && (
          <div style={{
            position: 'absolute', top: 12, right: 12, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            borderRadius: 12, padding: '4px 10px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: accuracyColor }} />
            <span style={{ fontSize: 12, color: 'white' }}>±{Math.round(position.accuracy)}m</span>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div style={{ background: '#0f2040', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '10px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
          {[
            { label: 'Distance', value: `${distanceNm.toFixed(2)} nm` },
            { label: 'Elapsed', value: formatDuration(elapsed) },
            { label: 'Speed', value: position?.speed != null ? `${position.speed.toFixed(1)} kn` : '—' },
            { label: 'Course', value: position?.course != null ? `${Math.round(position.course)}°` : '—' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: isTracking ? 'white' : 'rgba(255,255,255,0.3)', margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Start / Stop button */}
      <div style={{ background: '#0a1628', padding: '12px 16px 28px', flexShrink: 0 }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          {isTracking && (
            <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              {pointCount} GPS {pointCount === 1 ? 'point' : 'points'} recorded
            </p>
          )}
          <button
            onClick={isTracking ? stopTrip : startTrip}
            disabled={status === 'uploading'}
            style={{
              width: '100%', borderRadius: 16, padding: '18px 0',
              fontSize: 17, fontWeight: 700, border: 'none', cursor: 'pointer',
              background: status === 'uploading' ? '#555' : isTracking ? '#FF3B30' : '#007AFF',
              color: 'white', opacity: status === 'uploading' ? 0.6 : 1,
            }}
          >
            {status === 'uploading' ? 'Saving…' : isTracking ? '⏹ Stop Trip' : '▶ Start Trip'}
          </button>
        </div>
      </div>
    </div>
  )
}
