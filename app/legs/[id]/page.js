import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import LegDetailView from './LegDetailView'
import LegLiveUpdater from './LegLiveUpdater'

export const dynamic = 'force-dynamic'

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

function bearingDeg(lat1, lon1, lat2, lon2) {
  const toRad = d => d * Math.PI / 180
  const dLon = toRad(lon2 - lon1)
  const y = Math.sin(dLon) * Math.cos(toRad(lat2))
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

function enrichPoints(points) {
  return points.map((p, i) => {
    if (i === 0) return { ...p, calcCog: p.course, calcSog: p.speed }
    const prev = points[i - 1]
    const dtHours = (new Date(p.recorded_at) - new Date(prev.recorded_at)) / 3_600_000
    const distNm = haversineNm(
      parseFloat(prev.lat), parseFloat(prev.lng),
      parseFloat(p.lat), parseFloat(p.lng),
    )
    const calcCog = bearingDeg(
      parseFloat(prev.lat), parseFloat(prev.lng),
      parseFloat(p.lat), parseFloat(p.lng),
    )
    const calcSog = dtHours > 0 ? Math.round((distNm / dtHours) * 10) / 10 : null
    return {
      ...p,
      calcCog: p.course ?? Math.round(calcCog),
      calcSog: p.speed ?? calcSog,
    }
  })
}

function generateTimeline(leg, points, entries) {
  if (!leg?.started_at) return []

  const enriched = enrichPoints(points)
  const start = new Date(leg.started_at)
  const end = leg.ended_at ? new Date(leg.ended_at) : new Date()
  const snap = new Date(start)
  snap.setSeconds(0, 0)
  snap.setMilliseconds(0)

  const intervals = []
  let current = snap

  while (current <= end) {
    const windowEnd = new Date(current.getTime() + 5 * 60 * 1000)

    let closest = null, minDiff = Infinity
    for (const p of enriched) {
      const diff = Math.abs(new Date(p.recorded_at).getTime() - current.getTime())
      if (diff < minDiff) { minDiff = diff; closest = p }
    }
    const point = minDiff <= 5 * 60 * 1000 ? closest : null

    const windowEntries = (entries ?? []).filter(e => {
      const t = new Date(e.recorded_at)
      return t >= current && t < windowEnd
    })

    intervals.push({
      isoTime: current.toISOString(),
      cog: point?.calcCog ?? null,
      sog: point?.calcSog ?? null,
      entries: windowEntries,
    })

    current = new Date(current.getTime() + 5 * 60 * 1000)
  }

  return intervals
}

export default async function LegDetailPage({ params, searchParams }) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: leg }, { data: points }, { data: entries }, { data: notes }] = await Promise.all([
    supabase.from('legs').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('track_points').select('lat, lng, speed, course, recorded_at').eq('trip_id', id).order('recorded_at'),
    supabase.from('logbook_entries').select('*').eq('trip_id', id).order('recorded_at'),
    supabase.from('trip_notes').select('*').eq('trip_id', id).order('created_at'),
  ])

  if (!leg) redirect('/trips')

  const intervals = generateTimeline(leg, points, entries)
  const backHref = sp?.from ? `/trips/${sp.from}` : '/trips'

  return (
    <>
      {!leg.ended_at && <LegLiveUpdater legId={id} />}
      <LegDetailView
        leg={leg}
        intervals={intervals}
        points={points ?? []}
        entries={entries ?? []}
        initialNotes={notes ?? []}
        backHref={backHref}
      />
    </>
  )
}
