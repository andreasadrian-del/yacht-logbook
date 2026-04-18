'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/BottomNav'
import { useTripContext } from '@/app/TripContext'

const EVENTS = ['TACK', 'JIBE', 'REEF', 'UNREEF']

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="#34a853" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function LogEntryPage() {
  const { tripId, isTracking, currentPosition } = useTripContext()
  const [confirmed, setConfirmed] = useState(null)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [commentSaved, setCommentSaved] = useState(false)

  const disabled = isTracking !== true

  async function logEvent(type) {
    if (disabled) return
    await supabase.from('logbook_entries').insert({
      trip_id: tripId,
      event_type: type.toLowerCase(),
      recorded_at: new Date().toISOString(),
      lat: currentPosition?.lat ?? null,
      lng: currentPosition?.lng ?? null,
    })
    setConfirmed(type)
    setTimeout(() => setConfirmed(null), 1500)
  }

  async function saveComment() {
    if (!comment.trim() || disabled) return
    setSaving(true)
    await supabase.from('logbook_entries').insert({
      trip_id: tripId,
      event_type: 'comment',
      comment: comment.trim(),
      recorded_at: new Date().toISOString(),
      lat: currentPosition?.lat ?? null,
      lng: currentPosition?.lng ?? null,
    })
    setSaving(false)
    setComment('')
    setCommentSaved(true)
    setTimeout(() => setCommentSaved(false), 1500)
  }

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', background: '#f8f9fa', fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>

      <header style={{ background: '#fff', borderBottom: '1px solid #e8eaed', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#202124', letterSpacing: '-0.3px' }}>Log Entry</span>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px' }}>

          {disabled && isTracking !== null && (
            <div style={{
              background: '#fff3e0', borderRadius: 10, padding: '10px 16px',
              fontSize: 13, color: '#e65100', marginBottom: 24, textAlign: 'center',
            }}>
              Start a trip first
            </div>
          )}

          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
              Quick Event
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {EVENTS.map(type => {
                const isConfirmed = confirmed === type
                return (
                  <button
                    key={type}
                    onClick={() => logEvent(type)}
                    disabled={disabled}
                    style={{
                      width: '100%', padding: '18px', borderRadius: 14, fontSize: 16, fontWeight: 600,
                      cursor: disabled ? 'default' : 'pointer',
                      background: disabled ? '#f1f3f4' : isConfirmed ? '#e6f4ea' : '#fff',
                      color: disabled ? '#bdc1c6' : isConfirmed ? '#34a853' : '#202124',
                      border: `1.5px solid ${disabled ? '#e8eaed' : isConfirmed ? '#34a853' : '#e8eaed'}`,
                      boxShadow: disabled ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {isConfirmed ? <><CheckIcon /> Saved</> : type}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
              Add Comment
            </p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              disabled={disabled}
              placeholder={disabled ? 'Start a trip first' : 'Enter comment…'}
              rows={3}
              style={{
                width: '100%', padding: '12px 14px', fontSize: 15, borderRadius: 12,
                border: '1.5px solid #e8eaed', outline: 'none', resize: 'none',
                background: disabled ? '#f8f9fa' : '#fff', color: '#202124',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
            <button
              onClick={saveComment}
              disabled={disabled || !comment.trim() || saving}
              style={{
                marginTop: 10, width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                fontSize: 15, fontWeight: 600,
                background: commentSaved ? '#e6f4ea' : (disabled || !comment.trim()) ? '#e8eaed' : '#1a73e8',
                color: commentSaved ? '#34a853' : (disabled || !comment.trim()) ? '#9aa0a6' : '#fff',
                cursor: disabled || !comment.trim() ? 'default' : 'pointer',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {commentSaved ? <><CheckIcon /> Saved</> : saving ? 'Saving…' : 'Save Comment'}
            </button>
          </div>

        </div>
      </div>

      <BottomNav />
    </div>
  )
}
