export async function insertNote(supabase, legId, content) {
  const { data, error } = await supabase
    .from('trip_notes')
    .insert({ trip_id: legId, content })
    .select()
    .single()
  return { data, error }
}

export async function getNotes(supabase, legId) {
  const { data, error } = await supabase
    .from('trip_notes')
    .select('*')
    .eq('trip_id', legId)
    .order('created_at')
  return { data, error }
}

export async function deleteNotes(supabase, legId) {
  const { error } = await supabase.from('trip_notes').delete().eq('trip_id', legId)
  return { error }
}
