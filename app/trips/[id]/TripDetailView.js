'use client'

import { useState } from 'react'
import Link from 'next/link'
import TripMap from './TripMap'

const EVENT_LABELS = { tack: 'Tack', jibe: 'Jibe', reef: 'Reef', unreef: 'Unreef' }

function EventPill({ entry, onCommentClick }) {
  if (entry.event_type === 'comment') {
    return (
      <button
        onClick={() => onCommentClick(entry.comment)}
        style={{
          background: '#f3e8ff', color: '#7c3aed', border: 'none', borderRadius: 20,
          padding: '2px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 3,
        }}
      >
        💬
      </button>
    )
  }
  return (
    <span style={{
      background: '#e8f0fe', color: '#1a73e8', borderRadius: 20,
      padding: '2px 8px', fontSize: 11, fontWeight: 600,
    }}>
      {EVENT_LABELS[entry.event_type] ?? entry.event_type}
    </span>
  )
}

export default function TripDetailView({ trip, intervals, points, entries }) {
  const [activeComment, setActiveComment] = useState(null)

  const hasPoints = points && points.length > 0

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', background: '#f8f9fa', fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e8eaed', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/trips" style={{ color: '#1a73e8', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
            ← Trips
          </Link>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#202124' }}>{trip.dateLabel}</span>
        </div>
      </header>

      {/* Split body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* TOP HALF — Timeline */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#fff', minHeight: 0 }}>
          {intervals.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9aa0a6', fontSize: 14 }}>
              No track data recorded.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #e8eaed' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#5f6368', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', width: 56 }}>Time</th>
                  <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, color: '#5f6368', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', width: 52 }}>COG</th>
                  <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, color: '#5f6368', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', width: 52 }}>SOG</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#5f6368', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Events</th>
                </tr>
              </thead>
              <tbody>
                {intervals.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f3f4' }}>
                    <td style={{ padding: '9px 12px', color: '#202124', fontWeight: 500, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {row.time}
                    </td>
                    <td style={{ padding: '9px 8px', color: '#5f6368', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {row.cog != null ? `${Math.round(row.cog)}°` : '—'}
                    </td>
                    <td style={{ padding: '9px 8px', color: '#5f6368', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {row.sog != null ? row.sog.toFixed(1) : '—'}
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {row.entries.map(entry => (
                          <EventPill key={entry.id} entry={entry} onCommentClick={setActiveComment} />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* BOTTOM HALF — Map */}
        <div style={{ height: '45vh', flexShrink: 0, borderTop: '1px solid #e8eaed', position: 'relative', background: '#e8f0fe' }}>
          {hasPoints ? (
            <TripMap points={points} entries={entries} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa0a6', fontSize: 14 }}>
              No track points recorded
            </div>
          )}
        </div>

      </div>

      {/* Comment modal */}
      {activeComment && (
        <div
          onClick={() => setActiveComment(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 20, padding: '24px 20px', maxWidth: 360, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
          >
            <p style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Comment</p>
            <p style={{ margin: '0 0 20px', fontSize: 15, color: '#202124', lineHeight: 1.5 }}>{activeComment}</p>
            <button
              onClick={() => setActiveComment(null)}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#1a73e8', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
