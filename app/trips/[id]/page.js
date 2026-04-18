import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import TripMap from './TripMap'

export const dynamic = 'force-dynamic'

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDuration(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default async function TripDetailPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: trip }, { data: points }] = await Promise.all([
    supabase.from('trips').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase
      .from('track_points')
      .select('lat, lng, speed, course, recorded_at')
      .eq('trip_id', id)
      .order('recorded_at', { ascending: true }),
  ])

  if (!trip) redirect('/trips')

  const hasPoints = points && points.length > 0

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', background: '#0a1628' }}>
      {/* Nav bar */}
      <header style={{ background: '#0a1628', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <div style={{ maxWidth: 672, margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/trips" style={{ color: '#007AFF', fontSize: 15, textDecoration: 'none' }}>
            ← Trips
          </Link>
          <span style={{ color: 'white', fontWeight: 600, fontSize: 17 }}>Trip Track</span>
          <div style={{ width: 64 }} />
        </div>
      </header>

      {/* Trip info bar */}
      {trip && (
        <div style={{ background: '#0f2040', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
          <div style={{ maxWidth: 672, margin: '0 auto', padding: '12px 16px', display: 'flex', gap: 24 }}>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Started</p>
              <p style={{ fontSize: 13, color: 'white', fontWeight: 500, margin: '2px 0 0' }}>{formatDate(trip.started_at)}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Duration</p>
              <p style={{ fontSize: 13, color: 'white', fontWeight: 500, margin: '2px 0 0' }}>{formatDuration(trip.duration_seconds)}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Points</p>
              <p style={{ fontSize: 13, color: 'white', fontWeight: 500, margin: '2px 0 0' }}>{points?.length ?? 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Map — takes all remaining space */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {!hasPoints ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
            <p style={{ fontSize: 48, margin: '0 0 12px' }}>🗺️</p>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.6)', fontWeight: 600, margin: 0 }}>No track points recorded</p>
            <p style={{ fontSize: 13, margin: '4px 0 0' }}>GPS points upload every 15 seconds while tracking.</p>
          </div>
        ) : (
          <TripMap points={points} />
        )}
      </div>

      {/* Legend */}
      {hasPoints && (
        <div style={{ background: '#0f2040', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
          <div style={{ maxWidth: 672, margin: '0 auto', padding: '10px 16px', display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#34C759', border: '2px solid rgba(255,255,255,0.6)' }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Start</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF3B30', border: '2px solid rgba(255,255,255,0.6)' }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>End</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 28, height: 3, background: '#007AFF', borderRadius: 2 }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Track</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
