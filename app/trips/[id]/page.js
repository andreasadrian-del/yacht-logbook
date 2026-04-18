import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import TripDetailView from './TripDetailView'

export const dynamic = 'force-dynamic'

function generateTimeline(trip, points, entries) {
  if (!trip?.started_at || !points?.length) return []

  const start = new Date(trip.started_at)
  const end = trip.ended_at ? new Date(trip.ended_at) : new Date()

  // Snap start down to nearest 5-minute floor
  const snap = new Date(start)
  snap.setSeconds(0, 0)
  snap.setMinutes(snap.getMinutes() - (snap.getMinutes() % 5))

  const intervals = []
  let current = snap

  while (current <= end) {
    const windowEnd = new Date(current.getTime() + 5 * 60 * 1000)

    // Closest track point within 5 minutes of this interval
    let closest = null, minDiff = Infinity
    for (const p of points) {
      const diff = Math.abs(new Date(p.recorded_at).getTime() - current.getTime())
      if (diff < minDiff) { minDiff = diff; closest = p }
    }
    const point = minDiff <= 5 * 60 * 1000 ? closest : null

    // Logbook entries within this 5-min window
    const windowEntries = (entries ?? []).filter(e => {
      const t = new Date(e.recorded_at)
      return t >= current && t < windowEnd
    })

    intervals.push({
      time: current.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      cog: point?.course ?? null,
      sog: point?.speed ?? null,
      entries: windowEntries,
    })

    current = new Date(current.getTime() + 5 * 60 * 1000)
  }

  return intervals
}

export default async function TripDetailPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: trip }, { data: points }, { data: entries }] = await Promise.all([
    supabase.from('trips').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('track_points').select('lat, lng, speed, course, recorded_at').eq('trip_id', id).order('recorded_at'),
    supabase.from('logbook_entries').select('*').eq('trip_id', id).order('recorded_at'),
  ])

  if (!trip) redirect('/trips')

  const dateLabel = new Date(trip.started_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  const intervals = generateTimeline(trip, points, entries)

  return (
    <TripDetailView
      trip={{ ...trip, dateLabel }}
      intervals={intervals}
      points={points ?? []}
      entries={entries ?? []}
    />
  )
}
