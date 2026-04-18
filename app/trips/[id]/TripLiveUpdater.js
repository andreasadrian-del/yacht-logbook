'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Subscribes to new track points and logbook entries for a live trip and
// triggers a server-side refresh so the timeline stays up to date.
export default function TripLiveUpdater({ tripId }) {
  const router = useRouter()

  useEffect(() => {
    const channel = supabase
      .channel(`trip-live-${tripId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'track_points', filter: `trip_id=eq.${tripId}` },
        () => router.refresh())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logbook_entries', filter: `trip_id=eq.${tripId}` },
        () => router.refresh())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [tripId, router])

  return null
}
