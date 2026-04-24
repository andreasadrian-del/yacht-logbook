'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { updateTrip } from '@/lib/db/trips'

export default function EditTripModal({ trip, onClose, onSaved }) {
  const [name, setName] = useState(trip.name)
  const [startDate, setStartDate] = useState(trip.start_date)
  const [endDate, setEndDate] = useState(trip.end_date)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim() || !startDate || !endDate) return
    if (endDate < startDate) { setError('End date must be after start date.'); return }
    setSaving(true)
    const { error: err } = await updateTrip(supabase, trip.id, { name: name.trim(), startDate, endDate })
    if (err) { setError('Could not save changes.'); setSaving(false); return }
    onSaved()
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: '28px 20px', maxWidth: 340, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <p style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 700, color: '#202124', textAlign: 'center' }}>Edit Trip</p>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Name</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1px solid #e8eaed', fontSize: 15, outline: 'none', marginBottom: 14 }}
        />
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Start date</label>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1px solid #e8eaed', fontSize: 15, outline: 'none', marginBottom: 14 }}
        />
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>End date</label>
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1px solid #e8eaed', fontSize: 15, outline: 'none', marginBottom: error ? 8 : 20 }}
        />
        {error && <p style={{ margin: '0 0 12px', fontSize: 13, color: '#ea4335', textAlign: 'center' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid #e8eaed', background: '#fff', color: '#202124', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !startDate || !endDate}
            style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: saving || !name.trim() ? '#dadce0' : '#1a73e8', color: saving || !name.trim() ? '#9aa0a6' : '#fff', fontSize: 15, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
