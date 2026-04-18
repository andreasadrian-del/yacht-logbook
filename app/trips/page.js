import { createClient } from '@/lib/supabase-server'
import BottomNav from '@/app/BottomNav'
import TripsList from './TripsList'

export const dynamic = 'force-dynamic'

export default async function TripsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, started_at, ended_at, duration_seconds, distance_nm')
    .eq('user_id', user.id)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', background: '#f8f9fa', fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>

      <header style={{ background: '#fff', borderBottom: '1px solid #e8eaed', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#202124', letterSpacing: '-0.3px' }}>All Trips</span>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 24px' }}>

          {error && (
            <div style={{ background: '#fce8e6', borderRadius: 10, padding: '12px 16px', color: '#ea4335', fontSize: 14 }}>
              Error loading trips.
            </div>
          )}

          {!error && <TripsList initialTrips={trips ?? []} />}

        </div>
      </div>

      <BottomNav />
    </div>
  )
}
