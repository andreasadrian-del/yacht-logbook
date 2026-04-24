'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate, formatDuration } from '@/lib/format'
import LegRow from './LegRow'

export default function TripCard({ trip, legs, onEdit, onDeleteLeg }) {
  const [expanded, setExpanded] = useState(false)
  const totalNm = legs.reduce((s, l) => s + (l.distance_nm ?? 0), 0)
  const totalSeconds = legs.reduce((s, l) => s + (l.duration_seconds ?? 0), 0)

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ position: 'relative', background: '#1a73e8', borderRadius: expanded && legs.length > 0 ? '16px 16px 0 0' : 16 }}>
        <Link
          href={`/trips/${trip.id}`}
          style={{ display: 'block', textDecoration: 'none', padding: '14px 80px 14px 16px' }}
        >
          <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#fff' }}>{trip.name}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
              {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
              {legs.length} {legs.length === 1 ? 'leg' : 'legs'}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
              {totalNm > 0 ? `${totalNm.toFixed(1)} NM` : '— NM'}
            </span>
            {totalSeconds > 0 && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                {formatDuration(totalSeconds)}
              </span>
            )}
          </div>
        </Link>

        {legs.length > 0 && (
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ position: 'absolute', top: '50%', right: 42, transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 6, lineHeight: 0 }}
            aria-label={expanded ? 'Collapse legs' : 'Expand legs'}
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
            >
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
        )}

        <button
          onClick={e => { e.preventDefault(); onEdit(trip) }}
          style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 6, lineHeight: 0 }}
          aria-label="Edit trip"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>

      {expanded && legs.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '0 0 16px 16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {legs.map((leg, i) => (
            <LegRow key={leg.id} leg={leg} tripId={trip.id} isFirst={i === 0} onDelete={leg => onDeleteLeg(leg, trip.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
