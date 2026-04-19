'use client'

import Link from 'next/link'

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDuration(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function TripDetailView({ trip, legs }) {
  const totalNm = legs.reduce((sum, l) => sum + (l.distance_nm ?? 0), 0)
  const totalSeconds = legs.reduce((sum, l) => sum + (l.duration_seconds ?? 0), 0)

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', background: '#f8f9fa', fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>

      <header style={{ background: '#fff', borderBottom: '1px solid #e8eaed', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/trips" style={{ color: '#1a73e8', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
            ← Trips
          </Link>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#202124' }}>{trip.name}</span>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 32px' }}>

          {/* Trip summary card */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <p style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700, color: '#202124' }}>{trip.name}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dates</p>
                <p style={{ margin: '3px 0 0', fontSize: 14, fontWeight: 600, color: '#202124' }}>
                  {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Legs</p>
                <p style={{ margin: '3px 0 0', fontSize: 14, fontWeight: 600, color: '#202124' }}>{legs.length}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total NM</p>
                <p style={{ margin: '3px 0 0', fontSize: 14, fontWeight: 600, color: '#202124' }}>
                  {totalNm > 0 ? totalNm.toFixed(1) : '—'}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total time</p>
                <p style={{ margin: '3px 0 0', fontSize: 14, fontWeight: 600, color: '#202124' }}>
                  {formatDuration(totalSeconds)}
                </p>
              </div>
            </div>
          </div>

          {/* Legs list */}
          <p style={{ fontSize: 12, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
            Legs
          </p>

          {legs.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: '32px 20px', textAlign: 'center', color: '#9aa0a6', fontSize: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              No legs recorded in this date range.
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              {legs.map((leg, i) => (
                <Link
                  key={leg.id}
                  href={`/legs/${leg.id}?from=${trip.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', textDecoration: 'none', background: '#fff',
                    borderTop: i > 0 ? '1px solid #f1f3f4' : 'none',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#202124' }}>
                        {formatDate(leg.started_at)}
                      </p>
                      {!leg.ended_at && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#ea4335', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ea4335', display: 'inline-block' }} />
                          Recording
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      <span style={{ fontSize: 13, color: '#5f6368' }}>
                        {leg.distance_nm != null ? `${leg.distance_nm.toFixed(1)} NM` : '— NM'}
                      </span>
                      <span style={{ fontSize: 13, color: '#5f6368' }}>
                        {leg.ended_at ? formatDuration(leg.duration_seconds) : 'In progress'}
                      </span>
                      {leg.distance_nm != null && leg.duration_seconds > 0 && (
                        <span style={{ fontSize: 13, color: '#5f6368' }}>
                          {(leg.distance_nm / (leg.duration_seconds / 3600)).toFixed(1)} kn avg
                        </span>
                      )}
                    </div>
                  </div>
                  <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                    <path d="M1 1l6 5.5L1 12" stroke="#c7c7cc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
