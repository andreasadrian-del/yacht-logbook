export async function insertTrackPoints(supabase, legId, points) {
  const { error } = await supabase
    .from('track_points')
    .insert(points.map(p => ({ trip_id: legId, recorded_at: p.recorded_at, lat: p.lat, lng: p.lng, speed: p.speed, course: p.course })))
  return { error }
}

export async function getTrackPoints(supabase, legId) {
  const { data, error } = await supabase
    .from('track_points')
    .select('lat, lng, speed, course, recorded_at')
    .eq('trip_id', legId)
    .order('recorded_at')
  if (error) return { data: null, error }
  // lat/lng are stored as numeric in Postgres — parseFloat required before any JS math
  return { data: data.map(p => ({ ...p, lat: parseFloat(p.lat), lng: parseFloat(p.lng) })), error: null }
}

export async function getTrackPointsForLegs(supabase, legIds) {
  if (!legIds.length) return { data: [], error: null }
  const { data, error } = await supabase
    .from('track_points')
    .select('lat, lng, trip_id')
    .in('trip_id', legIds)
    .order('recorded_at')
  if (error) return { data: null, error }
  return { data: data.map(p => ({ ...p, lat: parseFloat(p.lat), lng: parseFloat(p.lng) })), error: null }
}

export async function deleteTrackPoints(supabase, legId) {
  const { error } = await supabase.from('track_points').delete().eq('trip_id', legId)
  return { error }
}
