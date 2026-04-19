import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import TripDetailView from './TripDetailView'

export const dynamic = 'force-dynamic'

export default async function TripDetailPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!trip) redirect('/trips')

  const { data: legs } = await supabase
    .from('legs')
    .select('id, started_at, ended_at, duration_seconds, distance_nm, last_lat, last_lng')
    .eq('user_id', user.id)
    .gte('started_at', trip.start_date)
    .lte('started_at', trip.end_date + 'T23:59:59.999Z')
    .order('started_at', { ascending: true })

  return <TripDetailView trip={trip} legs={legs ?? []} />
}
