'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LegLiveUpdater({ legId }) {
  const router = useRouter()

  useEffect(() => {
    const channel = supabase
      .channel(`leg-live-${legId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'track_points', filter: `trip_id=eq.${legId}` },
        () => router.refresh())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logbook_entries', filter: `trip_id=eq.${legId}` },
        () => router.refresh())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [legId, router])

  return null
}
