import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import BottomNav from '@/app/BottomNav'

export const dynamic = 'force-dynamic'

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

export default async function TripsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, started_at, ended_at, duration_seconds, distance_nm')
    .eq('user_id', user.id)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', background: '#f8f9fa', fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>

      <header style={{ background: '#fff', borderBottom: '1px solid #e8eaed', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#202124', letterSpacing: '-0.3px' }}>All Trips</span>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 24px' }}>

          {error && (
            <div style={{ background: '#fce8e6', borderRadius: 10, padding: '12px 16px', color: '#ea4335', fontSize: 14 }}>
              Error loading trips.
            </div>
          )}

          {!error && trips?.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ fontSize: 48, margin: '0 0 12px' }}>🗺️</p>
              <p style={{ fontSize: 17, fontWeight: 600, color: '#202124', margin: '0 0 6px' }}>No trips yet</p>
              <p style={{ fontSize: 14, color: '#5f6368', margin: 0 }}>Start tracking from the Tracking tab.</p>
            </div>
          )}

          {trips && trips.length > 0 && (
            <>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
                {trips.length} {trips.length === 1 ? 'Trip' : 'Trips'}
              </p>
              <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                {trips.map((trip, i) => (
                  <Link
                    key={trip.id}
                    href={`/trips/${trip.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', textDecoration: 'none',
                      borderTop: i > 0 ? '1px solid #f1f3f4' : 'none',
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#202124' }}>
                        {formatDate(trip.started_at)}
                      </p>
                      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                        <span style={{ fontSize: 13, color: '#5f6368' }}>
                          {trip.distance_nm != null ? `${trip.distance_nm.toFixed(1)} NM` : '— NM'}
                        </span>
                        <span style={{ fontSize: 13, color: '#5f6368' }}>
                          {formatDuration(trip.duration_seconds)}
                        </span>
                      </div>
                    </div>
                    <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                      <path d="M1 1l6 5.5L1 12" stroke="#c7c7cc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                ))}
              </div>
            </>
          )}

        </div>
      </div>

      <BottomNav />
    </div>
  )
}
