export async function getLegs(supabase) {
  const { data, error } = await supabase
    .from('legs')
    .select('id, started_at, ended_at, duration_seconds, distance_nm, last_lat, last_lng')
    .is('deleted_at', null)
    .order('started_at', { ascending: false })
  return { data, error }
}

export async function getLeg(supabase, id, userId) {
  const { data, error } = await supabase
    .from('legs')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  return { data, error }
}

export async function getDeletedLegs(supabase) {
  const { data, error } = await supabase
    .from('legs')
    .select('id, started_at, ended_at, duration_seconds, distance_nm, deleted_at')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
  return { data, error }
}

export async function createLeg(supabase, userId) {
  const { data, error } = await supabase
    .from('legs')
    .insert({ started_at: new Date().toISOString(), user_id: userId })
    .select('id')
    .single()
  return { data, error }
}

export async function updateLegPosition(supabase, id, lat, lng) {
  const { error } = await supabase
    .from('legs')
    .update({ last_lat: lat, last_lng: lng })
    .eq('id', id)
  return { error }
}

export async function stopLeg(supabase, id, { endedAt, durationSeconds, distanceNm, lastLat, lastLng }) {
  const fields = { ended_at: endedAt, duration_seconds: durationSeconds, distance_nm: distanceNm }
  if (lastLat != null && lastLng != null) { fields.last_lat = lastLat; fields.last_lng = lastLng }
  const { error } = await supabase.from('legs').update(fields).eq('id', id)
  return { error }
}

export async function softDeleteLeg(supabase, id) {
  const { error } = await supabase
    .from('legs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  return { error }
}

export async function restoreLeg(supabase, id) {
  const { error } = await supabase
    .from('legs')
    .update({ deleted_at: null })
    .eq('id', id)
  return { error }
}

// Pure function — no Supabase call. Caller must pass non-deleted legs only.
export function groupLegsIntoTrips(trips, legs) {
  // Sort trips oldest-first so the first-created trip wins when ranges overlap
  const sortedTrips = [...trips].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const assignedLegIds = new Set()

  const grouped = sortedTrips.map(trip => {
    const tripLegs = legs.filter(leg => {
      if (assignedLegIds.has(leg.id)) return false
      const d = leg.started_at.slice(0, 10)
      return d >= trip.start_date && d <= trip.end_date
    })
    tripLegs.forEach(l => assignedLegIds.add(l.id))
    return { trip, legs: tripLegs }
  }).sort((a, b) => new Date(b.trip.start_date) - new Date(a.trip.start_date))

  const standaloneLegs = legs.filter(l => !assignedLegIds.has(l.id))
  return { grouped, standaloneLegs }
}

export async function hardDeleteLeg(supabase, id) {
  for (const [table, col] of [['track_points', 'trip_id'], ['logbook_entries', 'trip_id'], ['trip_notes', 'trip_id']]) {
    const { error } = await supabase.from(table).delete().eq(col, id)
    if (error) return { error }
  }
  const { error } = await supabase.from('legs').delete().eq('id', id)
  return { error }
}
