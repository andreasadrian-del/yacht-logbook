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

export async function hardDeleteLeg(supabase, id) {
  for (const [table, col] of [['track_points', 'trip_id'], ['logbook_entries', 'trip_id'], ['trip_notes', 'trip_id']]) {
    const { error } = await supabase.from(table).delete().eq(col, id)
    if (error) return { error }
  }
  const { error } = await supabase.from('legs').delete().eq('id', id)
  return { error }
}
