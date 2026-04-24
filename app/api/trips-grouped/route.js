import { createClient } from '@/lib/supabase-server'
import { getTrips } from '@/lib/db/trips'
import { getLegs, groupLegsIntoTrips } from '@/lib/db/legs'

export async function GET() {
  const supabase = await createClient()

  const [{ data: trips, error: tripsError }, { data: legs, error: legsError }] = await Promise.all([
    getTrips(supabase),
    getLegs(supabase),
  ])

  if (tripsError || legsError) {
    return Response.json({ error: 'Failed to load data' }, { status: 500 })
  }

  const { grouped, standaloneLegs } = groupLegsIntoTrips(trips ?? [], legs ?? [])
  return Response.json({ grouped, standaloneLegs })
}
