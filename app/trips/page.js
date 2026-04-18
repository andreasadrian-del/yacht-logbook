import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// Always fetch live data — never statically build this page
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
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default async function TripsPage() {
  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, started_at, ended_at, duration_seconds')
    .order('started_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      {/* Nav bar */}
      <header className="bg-[#F2F2F7]/80 backdrop-blur-xl sticky top-0 z-10 border-b border-black/[0.08]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-[#007AFF] text-[15px]">
            ← Track
          </Link>
          <span className="font-semibold text-[17px]">All Trips</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {error && (
          <div className="bg-white rounded-2xl px-4 py-4 text-[#FF3B30] text-[15px]">
            Error loading trips: {error.message}
          </div>
        )}

        {!error && trips?.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🗺️</p>
            <p className="text-[17px] font-semibold text-black mb-1">No trips yet</p>
            <p className="text-[15px] text-[#8E8E93] mb-6">Start tracking from the main screen.</p>
            <Link href="/" className="text-[#007AFF] text-[17px]">Start a trip</Link>
          </div>
        )}

        {trips && trips.length > 0 && (
          <>
            <p className="text-[13px] font-medium text-[#6C6C70] uppercase tracking-wide px-4 mb-2">
              {trips.length} {trips.length === 1 ? 'Trip' : 'Trips'}
            </p>
            <div className="bg-white rounded-2xl overflow-hidden divide-y divide-black/[0.08]">
              {trips.map((trip) => (
                <Link key={trip.id} href={`/trips/${trip.id}`} className="block px-4 py-4 active:bg-black/[0.04] transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[17px] font-semibold text-black">
                        {formatDate(trip.started_at)}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[13px] text-[#8E8E93]">
                          Duration: {formatDuration(trip.duration_seconds)}
                        </span>
                        {!trip.ended_at && (
                          <span className="text-[12px] font-medium text-[#FF9500] bg-orange-50 rounded-full px-2 py-0.5">
                            In progress
                          </span>
                        )}
                      </div>
                    </div>
                    <svg width="8" height="13" viewBox="0 0 8 13" fill="none" className="mt-1.5">
                      <path d="M1 1l6 5.5L1 12" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
