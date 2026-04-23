'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/BottomNav'
import WayLogIcon from '@/app/WayLogIcon'

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDuration(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function DeletedLegRow({ leg, isFirst, onRestore, onHardDelete }) {
  const [offsetX, setOffsetX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const isHorizontal = useRef(false)
  const BTN_WIDTH = 80
  const REVEAL_THRESHOLD = 60

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isHorizontal.current = false
    setIsDragging(true)
  }

  function onTouchMove(e) {
    if (touchStartX.current === null) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    if (!isHorizontal.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      isHorizontal.current = Math.abs(dx) > Math.abs(dy)
      if (!isHorizontal.current) return
    }
    e.preventDefault()
    setOffsetX(Math.min(BTN_WIDTH, Math.max(-BTN_WIDTH, dx)))
  }

  function onTouchEnd() {
    setIsDragging(false)
    if (offsetX > REVEAL_THRESHOLD) setOffsetX(BTN_WIDTH)
    else if (offsetX < -REVEAL_THRESHOLD) setOffsetX(-BTN_WIDTH)
    else setOffsetX(0)
    touchStartX.current = null
  }

  return (
    <div
      style={{ position: 'relative', overflow: 'hidden', borderTop: isFirst ? 'none' : '1px solid #f1f3f4' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Restore button — left side */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: BTN_WIDTH,
        background: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <button
          onClick={() => onRestore(leg)}
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', height: '100%' }}
        >
          Restore
        </button>
      </div>

      {/* Delete button — right side */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: BTN_WIDTH,
        background: '#ea4335', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <button
          onClick={() => onHardDelete(leg)}
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', height: '100%' }}
        >
          Delete
        </button>
      </div>

      {/* Row content */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', background: '#fff',
        transform: `translateX(${offsetX}px)`,
        transition: isDragging ? 'none' : 'transform 0.25s ease',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#202124' }}>
            {formatDate(leg.started_at)}
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 3 }}>
            <span style={{ fontSize: 13, color: '#5f6368' }}>{leg.distance_nm != null ? `${leg.distance_nm.toFixed(1)} NM` : '— NM'}</span>
            <span style={{ fontSize: 13, color: '#5f6368' }}>{leg.ended_at ? formatDuration(leg.duration_seconds) : 'In progress'}</span>
            {leg.distance_nm != null && leg.duration_seconds > 0 && (
              <span style={{ fontSize: 13, color: '#5f6368' }}>{(leg.distance_nm / (leg.duration_seconds / 3600)).toFixed(1)} kn avg</span>
            )}
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9aa0a6' }}>
            Deleted {formatDate(leg.deleted_at)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function MorePage() {
  const [deletedLegs, setDeletedLegs] = useState(null)
  const [confirmLeg, setConfirmLeg] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchDeleted = useCallback(async () => {
    const { data } = await supabase
      .from('legs')
      .select('id, started_at, ended_at, duration_seconds, distance_nm, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    setDeletedLegs(data ?? [])
  }, [])

  useEffect(() => {
    fetchDeleted()
    const channel = supabase
      .channel('deleted-legs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'legs' }, fetchDeleted)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchDeleted])

  async function handleRestore(leg) {
    await supabase.from('legs').update({ deleted_at: null }).eq('id', leg.id)
    fetchDeleted()
  }

  async function handleHardDelete(leg) {
    setConfirmLeg(leg)
  }

  async function confirmHardDelete() {
    if (!confirmLeg) return
    setDeleting(true)
    const id = confirmLeg.id
    await supabase.from('track_points').delete().eq('trip_id', id)
    await supabase.from('logbook_entries').delete().eq('trip_id', id)
    await supabase.from('trip_notes').delete().eq('trip_id', id)
    await supabase.from('legs').delete().eq('id', id)
    setConfirmLeg(null)
    setDeleting(false)
    fetchDeleted()
  }

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', background: '#f8f9fa', fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>

      <header style={{ background: '#fff', borderBottom: '1px solid #e8eaed', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', gap: 10 }}>
          <WayLogIcon size={28} instanceId="more-header" />
          <span style={{ fontSize: 18, fontWeight: 700, color: '#202124', letterSpacing: '-0.3px' }}>Logbook Nadira</span>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 24px' }}>

          <p style={{ fontSize: 12, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
            Deleted Legs &amp; Trips
          </p>

          {deletedLegs === null && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9aa0a6', fontSize: 14 }}>Loading…</div>
          )}

          {deletedLegs !== null && deletedLegs.length === 0 && (
            <div style={{ background: '#fff', borderRadius: 16, padding: '32px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <p style={{ fontSize: 17, fontWeight: 600, color: '#202124', margin: '0 0 6px' }}>Nothing deleted</p>
              <p style={{ fontSize: 14, color: '#5f6368', margin: 0 }}>Deleted legs will appear here.</p>
            </div>
          )}

          {deletedLegs !== null && deletedLegs.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              {deletedLegs.map((leg, i) => (
                <DeletedLegRow
                  key={leg.id}
                  leg={leg}
                  isFirst={i === 0}
                  onRestore={handleRestore}
                  onHardDelete={handleHardDelete}
                />
              ))}
            </div>
          )}

          {deletedLegs !== null && deletedLegs.length > 0 && (
            <p style={{ textAlign: 'center', fontSize: 11, color: '#9aa0a6', margin: '16px 0 0', lineHeight: 1.5 }}>
              Swipe right to restore a leg · Swipe left to permanently delete
            </p>
          )}

        </div>
      </div>

      {/* Confirm permanent delete */}
      {confirmLeg && (
        <div
          onClick={() => !deleting && setConfirmLeg(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 20, padding: '28px 20px', maxWidth: 320, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
          >
            <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#202124', textAlign: 'center' }}>Permanently Delete?</p>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#5f6368', textAlign: 'center', lineHeight: 1.5 }}>
              {formatDate(confirmLeg.started_at)} — this will permanently delete all track points and log entries. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmLeg(null)}
                disabled={deleting}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid #e8eaed', background: '#fff', color: '#202124', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmHardDelete}
                disabled={deleting}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: deleting ? '#dadce0' : '#ea4335', color: '#fff', fontSize: 15, fontWeight: 600, cursor: deleting ? 'wait' : 'pointer' }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
