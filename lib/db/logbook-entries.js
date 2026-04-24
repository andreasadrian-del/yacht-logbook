export async function insertLogbookEntry(supabase, { legId, eventType, recordedAt, lat, lng, comment }) {
  const { error } = await supabase
    .from('logbook_entries')
    .insert({ trip_id: legId, event_type: eventType, recorded_at: recordedAt, lat, lng, comment: comment ?? null })
  return { error }
}

export async function getLogbookEntries(supabase, legId) {
  const { data, error } = await supabase
    .from('logbook_entries')
    .select('*')
    .eq('trip_id', legId)
    .order('recorded_at')
  return { data, error }
}

export async function deleteLogbookEntries(supabase, legId) {
  const { error } = await supabase.from('logbook_entries').delete().eq('trip_id', legId)
  return { error }
}
