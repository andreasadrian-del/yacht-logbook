'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const DEBUG_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const DEBUG_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Haversine distance in nautical miles between two lat/lng points
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

function StatCard({ label, value, unit, dim }) {
  return (
    <div className="bg-white rounded-2xl px-4 py-4 flex-1 text-center">
      <p className={`text-[28px] font-bold tracking-tight ${dim ? 'text-[#C7C7CC]' : 'text-black'}`}>
        {value}
        {unit && <span className="text-[16px] font-normal text-[#8E8E93] ml-1">{unit}</span>}
      </p>
      <p className="text-[12px] text-[#8E8E93] mt-1">{label}</p>
    </div>
  )
}

export default function TrackingPage() {
  const [isTracking, setIsTracking] = useState(false)
  const [position, setPosition] = useState(null)
  const [pointCount, setPointCount] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [distanceNm, setDistanceNm] = useState(0)
  const [status, setStatus] = useState('idle')      // idle | tracking | uploading | error
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

  // Clean up on unmount
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
      setStatus('error')
      setStatusMsg('GPS not available on this device.')
      return
    }

    setStatus('uploading')
    setStatusMsg('Creating trip…')

    const { data, error } = await supabase
      .from('trips')
      .insert({ started_at: new Date().toISOString() })
      .select('id')
      .single()

    if (error) {
      setStatus('error')
      setStatusMsg('Could not create trip: ' + error.message)
      return
    }

    tripIdRef.current = data.id
    startTimeRef.current = Date.now()
    lastPositionRef.current = null
    distanceRef.current = 0
    pointCountRef.current = 0
    pendingPointsRef.current = []

    setDistanceNm(0)
    setPointCount(0)
    setElapsed(0)
    setPosition(null)

    // Elapsed time ticker
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    // Batch upload every 15 seconds
    uploadIntervalRef.current = setInterval(uploadPending, 15000)

    // Start GPS watch
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading, accuracy } = pos.coords

        // Ignore low-accuracy readings
        if (accuracy > 50) return

        const speedKnots = speed != null ? speed * 1.94384 : null
        const point = {
          lat: latitude,
          lng: longitude,
          speed: speedKnots != null ? Math.round(speedKnots * 10) / 10 : null,
          course: heading != null ? Math.round(heading) : null,
          timestamp: new Date(pos.timestamp).toISOString(),
        }

        pendingPointsRef.current.push(point)
        pointCountRef.current += 1
        setPointCount(pointCountRef.current)

        // Accumulate distance
        if (lastPositionRef.current) {
          const d = haversineNm(
            lastPositionRef.current.lat, lastPositionRef.current.lng,
            latitude, longitude
          )
          distanceRef.current += d
          setDistanceNm(Math.round(distanceRef.current * 100) / 100)
        }
        lastPositionRef.current = { lat: latitude, lng: longitude }

        setPosition({
          lat: latitude.toFixed(5),
          lng: longitude.toFixed(5),
          speed: speedKnots != null ? speedKnots.toFixed(1) : null,
          course: heading != null ? Math.round(heading) : null,
          accuracy: Math.round(accuracy),
        })
      },
      (err) => {
        setStatus('error')
        setStatusMsg('GPS error: ' + err.message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    setIsTracking(true)
    setStatus('tracking')
    setStatusMsg('')
  }

  const stopTrip = async () => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
    if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current)
    if (timerRef.current) clearInterval(timerRef.current)

    setStatus('uploading')
    setStatusMsg('Saving trip…')

    // Upload remaining points
    await uploadPending()

    // Finalise trip record
    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
    await supabase
      .from('trips')
      .update({ ended_at: new Date().toISOString(), duration_seconds: durationSeconds })
      .eq('id', tripIdRef.current)

    tripIdRef.current = null
    setIsTracking(false)
    setStatus('idle')
    setStatusMsg('')
  }

  const accuracyColor = position
    ? position.accuracy <= 10 ? '#34C759'
      : position.accuracy <= 30 ? '#FF9500'
      : '#FF3B30'
    : '#C7C7CC'

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      {/* Nav bar */}
      <header className="bg-[#F2F2F7]/80 backdrop-blur-xl sticky top-0 z-10 border-b border-black/[0.08]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚓</span>
            <span className="font-semibold text-[17px]">Yacht Logbook</span>
          </div>
          <Link href="/trips" className="text-[#007AFF] text-[15px]">
            All Trips
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Status pill */}
        {statusMsg && (
          <div className={`text-center text-[13px] py-2 px-4 rounded-full ${
            status === 'error' ? 'bg-red-100 text-[#FF3B30]' : 'bg-blue-50 text-[#007AFF]'
          }`}>
            {statusMsg}
          </div>
        )}

        {/* Live stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Distance" value={distanceNm.toFixed(2)} unit="nm" dim={!isTracking} />
          <StatCard label="Elapsed" value={formatDuration(elapsed)} dim={!isTracking} />
          <StatCard
            label="Speed"
            value={position?.speed ?? '—'}
            unit={position?.speed != null ? 'kn' : undefined}
            dim={!isTracking}
          />
          <StatCard
            label="Course"
            value={position?.course != null ? `${position.course}°` : '—'}
            dim={!isTracking}
          />
        </div>

        {/* Position card */}
        <div className="bg-white rounded-2xl px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-medium text-[#6C6C70] uppercase tracking-wide">Position</p>
            {position && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accuracyColor }} />
                <span className="text-[12px] text-[#8E8E93]">±{position.accuracy}m</span>
              </div>
            )}
          </div>
          {position ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[12px] text-[#8E8E93]">Latitude</p>
                <p className="text-[17px] font-mono text-black">{position.lat}</p>
              </div>
              <div>
                <p className="text-[12px] text-[#8E8E93]">Longitude</p>
                <p className="text-[17px] font-mono text-black">{position.lng}</p>
              </div>
            </div>
          ) : (
            <p className="text-[15px] text-[#C7C7CC]">
              {isTracking ? 'Waiting for GPS fix…' : 'Start a trip to begin tracking'}
            </p>
          )}
        </div>

        {/* Point counter */}
        {isTracking && (
          <p className="text-center text-[13px] text-[#8E8E93]">
            {pointCount} GPS {pointCount === 1 ? 'point' : 'points'} recorded
          </p>
        )}

        {/* Debug info */}
        <div className="bg-white rounded-2xl px-4 py-3 text-[11px] font-mono break-all text-[#8E8E93] space-y-1">
          <p><span className="text-black font-semibold">URL:</span> {DEBUG_URL ?? 'undefined'}</p>
          <p><span className="text-black font-semibold">KEY:</span> {DEBUG_KEY ? DEBUG_KEY.slice(0, 40) + '…' : 'undefined'}</p>
        </div>

        {/* Start / Stop */}
        <button
          onClick={isTracking ? stopTrip : startTrip}
          disabled={status === 'uploading'}
          className={`w-full rounded-2xl py-5 text-[17px] font-bold tracking-wide transition-colors disabled:opacity-40 ${
            isTracking ? 'bg-[#FF3B30] text-white' : 'bg-[#007AFF] text-white'
          }`}
        >
          {status === 'uploading' ? 'Saving…' : isTracking ? '⏹ Stop Trip' : '▶ Start Trip'}
        </button>
      </main>
    </div>
  )
}
