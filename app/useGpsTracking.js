'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

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

export function useGpsTracking({ isTracking, tripId, tripStartTime, startTrip, endTrip, setCurrentPosition }) {
  const [position, setPosition] = useState(null)
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

  // Get a position fix immediately on mount so the map zooms in before a trip starts
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        localStorage.setItem('lastLat', latitude)
        localStorage.setItem('lastLng', longitude)
        setPosition(prev => prev ?? { lat: latitude, lng: longitude, speed: null, course: null, accuracy })
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

  const acquireWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return
    try { wakeLockRef.current = await navigator.wakeLock.request('screen') } catch (_) {}
  }, [])

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

    startTrip(data.id)
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

  return { position, trackPoints, elapsed, distanceNm, status, statusMsg, startTripHandler, stopTripHandler }
}
