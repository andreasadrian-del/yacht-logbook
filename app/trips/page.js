'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/BottomNav'
import WayLogIcon from '@/app/WayLogIcon'
import TripsList from './TripsList'

export default function TripsPage() {
  const [trips, setTrips] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    supabase
      .from('trips')
      .select('id, started_at, ended_at, duration_seconds, distance_nm, last_lat, last_lng')
      .order('started_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(true)
        else setTrips(data ?? [])
      })
  }, [])

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', background: '#f8f9fa', fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>

      <header style={{ background: '#fff', borderBottom: '1px solid #e8eaed', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', gap: 10 }}>
          <WayLogIcon size={28} instanceId="trips-header" />
          <span style={{ fontSize: 18, fontWeight: 700, color: '#202124', letterSpacing: '-0.3px' }}>Logbook Nadira</span>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 24px' }}>

          {error && (
            <div style={{ background: '#fce8e6', borderRadius: 10, padding: '12px 16px', color: '#ea4335', fontSize: 14 }}>
              Error loading trips.
            </div>
          )}

          {!error && trips === null && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9aa0a6', fontSize: 14 }}>
              Loading…
            </div>
          )}

          {!error && trips !== null && <TripsList initialTrips={trips} />}

        </div>
      </div>

      <BottomNav />
    </div>
  )
}
