import Link from 'next/link'
import { supabase } from '@/lib/supabase'
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

  const [{ data: trip }, { data: points }] = await Promise.all([
    supabase.from('trips').select('*').eq('id', id).single(),
    supabase
      .from('track_points')
      .select('lat, lng, speed, course, recorded_at')
      .eq('trip_id', id)
      .order('recorded_at', { ascending: true }),
  ])

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">
      {/* Nav bar */}
      <header className="bg-[#0a1628]/90 backdrop-blur-xl border-b border-white/10 shrink-0">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/trips" className="text-[#007AFF] text-[15px]">
            ← Trips
          </Link>
          <span className="font-semibold text-[17px] text-white">Trip Track</span>
          <div className="w-16" />
        </div>
      </header>

      {/* Trip info bar */}
      {trip && (
        <div className="bg-[#0f2040] border-b border-white/10 shrink-0">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-6">
            <div>
              <p className="text-[11px] text-white/40 uppercase tracking-wide">Started</p>
              <p className="text-[13px] text-white font-medium">{formatDate(trip.started_at)}</p>
            </div>
            <div>
              <p className="text-[11px] text-white/40 uppercase tracking-wide">Duration</p>
              <p className="text-[13px] text-white font-medium">{formatDuration(trip.duration_seconds)}</p>
            </div>
            <div>
              <p className="text-[11px] text-white/40 uppercase tracking-wide">Points</p>
              <p className="text-[13px] text-white font-medium">{points?.length ?? 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: '60svh' }}>
        {/* Leaflet CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />

        {!points || points.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
            <p className="text-5xl mb-4">🗺️</p>
            <p className="text-[17px] font-semibold text-white/60">No track points recorded</p>
            <p className="text-[13px] mt-1">GPS points are uploaded every 15 seconds while tracking.</p>
          </div>
        ) : (
          <TripMap points={points} />
        )}
      </div>

      {/* Legend */}
      {points && points.length > 0 && (
        <div className="bg-[#0f2040] border-t border-white/10 shrink-0">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#34C759] border-2 border-white/60" />
              <span className="text-[12px] text-white/60">Start</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF3B30] border-2 border-white/60" />
              <span className="text-[12px] text-white/60">End</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-[#007AFF]" />
              <span className="text-[12px] text-white/60">Track</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
