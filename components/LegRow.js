'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { formatDate, formatDuration } from '@/lib/format'

const REVEAL_THRESHOLD = 60
const DELETE_BTN_WIDTH = 80

export default function LegRow({ leg, tripId, isFirst, onDelete }) {
  const [offsetX, setOffsetX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const isHorizontal = useRef(false)

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
    setOffsetX(Math.min(0, Math.max(-DELETE_BTN_WIDTH, dx)))
  }

  function onTouchEnd() {
    setIsDragging(false)
    setOffsetX(offsetX < -REVEAL_THRESHOLD ? -DELETE_BTN_WIDTH : 0)
    touchStartX.current = null
  }

  const href = tripId ? `/legs/${leg.id}?from=${tripId}` : `/legs/${leg.id}`

  return (
    <div
      style={{ position: 'relative', overflow: 'hidden', borderTop: isFirst ? 'none' : '1px solid #f1f3f4' }}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
    >
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: DELETE_BTN_WIDTH, background: '#ea4335', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={() => onDelete(leg)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', height: '100%' }}>
          Delete
        </button>
      </div>
      <Link
        href={href}
        onClick={e => { if (offsetX !== 0) { e.preventDefault(); setOffsetX(0) } }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', textDecoration: 'none', background: '#fff',
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s ease',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#202124' }}>
              {formatDate(leg.started_at)}
            </p>
            {!leg.ended_at && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#ea4335', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ea4335', display: 'inline-block' }} />
                Recording
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 3 }}>
            <span style={{ fontSize: 13, color: '#5f6368' }}>{leg.distance_nm != null ? `${leg.distance_nm.toFixed(1)} NM` : '— NM'}</span>
            <span style={{ fontSize: 13, color: '#5f6368' }}>{leg.ended_at ? formatDuration(leg.duration_seconds) : 'In progress'}</span>
            {leg.distance_nm != null && leg.duration_seconds > 0 && (
              <span style={{ fontSize: 13, color: '#5f6368' }}>{(leg.distance_nm / (leg.duration_seconds / 3600)).toFixed(1)} kn avg</span>
            )}
          </div>
        </div>
        <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
          <path d="M1 1l6 5.5L1 12" stroke="#c7c7cc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Link>
    </div>
  )
}
