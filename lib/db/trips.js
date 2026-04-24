export async function getTrips(supabase) {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('start_date', { ascending: false })
  return { data, error }
}

export async function getTrip(supabase, id, userId) {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  return { data, error }
}

export async function createTrip(supabase, { userId, name, startDate, endDate }) {
  const { data, error } = await supabase
    .from('trips')
    .insert({ user_id: userId, name, start_date: startDate, end_date: endDate })
    .select()
    .single()
  return { data, error }
}

export async function updateTrip(supabase, id, { name, startDate, endDate }) {
  const { error } = await supabase
    .from('trips')
    .update({ name, start_date: startDate, end_date: endDate })
    .eq('id', id)
  return { error }
}

export async function deleteTrip(supabase, id) {
  const { error } = await supabase.from('trips').delete().eq('id', id)
  return { error }
}
