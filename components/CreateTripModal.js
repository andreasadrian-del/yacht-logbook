'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { createTrip } from '@/lib/db/trips'

export default function CreateTripModal({ onClose, onCreated }) {
  const [step, setStep] = useState('name') // 'name' | 'dates'
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim() || !startDate || !endDate) return
    if (endDate < startDate) { setError('End date must be after start date.'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await createTrip(supabase, { userId: user.id, name: name.trim(), startDate, endDate })
    if (err) { setError('Could not save trip.'); setSaving(false); return }
    onCreated()
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: '28px 20px', maxWidth: 340, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>

        {step === 'name' && (
          <>
            <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#202124', textAlign: 'center' }}>New Trip</p>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#5f6368', textAlign: 'center' }}>Give this trip a name</p>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) setStep('dates') }}
              placeholder="e.g. Croatia 2025"
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1px solid #e8eaed', fontSize: 15, outline: 'none', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid #e8eaed', background: '#fff', color: '#202124', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={() => name.trim() && setStep('dates')}
                disabled={!name.trim()}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: name.trim() ? '#1a73e8' : '#dadce0', color: name.trim() ? '#fff' : '#9aa0a6', fontSize: 15, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'default' }}
              >
                Next
              </button>
            </div>
          </>
        )}

        {step === 'dates' && (
          <>
            <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#202124', textAlign: 'center' }}>{name}</p>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#5f6368', textAlign: 'center' }}>Select the date range</p>
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
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1px solid #e8eaed', fontSize: 15, outline: 'none', marginBottom: error ? 8 : 16 }}
            />
            {error && <p style={{ margin: '0 0 12px', fontSize: 13, color: '#ea4335', textAlign: 'center' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setStep('name'); setError('') }} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid #e8eaed', background: '#fff', color: '#202124', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !startDate || !endDate}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: saving || !startDate || !endDate ? '#dadce0' : '#1a73e8', color: saving || !startDate || !endDate ? '#9aa0a6' : '#fff', fontSize: 15, fontWeight: 600, cursor: saving || !startDate || !endDate ? 'default' : 'pointer' }}
              >
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
