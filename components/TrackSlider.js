'use client'

import { useRef, useState, useLayoutEffect, useEffect } from 'react'

const THUMB = 52
const PAD = 4

export default function TrackSlider({ tracking, status, onStart, onStop }) {
  const trackRef = useRef(null)
  const thumbRef = useRef(null)
  const dragging = useRef(false)
  const startX = useRef(0)
  const [busy, setBusy] = useState(false)

  const disabled = status === 'uploading' || busy

  function travel() {
    return (trackRef.current?.offsetWidth ?? 320) - THUMB - PAD * 2
  }

  // Jump thumb to its home position whenever tracking changes
  useLayoutEffect(() => {
    if (!thumbRef.current) return
    setBusy(false)
    thumbRef.current.style.transition = 'none'
    thumbRef.current.style.transform = tracking ? `translateX(${travel()}px)` : 'translateX(0px)'
  }, [tracking]) // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent page scroll while dragging (passive:false required)
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const block = (e) => { if (dragging.current) e.preventDefault() }
    el.addEventListener('touchmove', block, { passive: false })
    return () => el.removeEventListener('touchmove', block)
  }, [])

  function onTouchStart(e) {
    if (disabled) return
    dragging.current = true
    startX.current = e.touches[0].clientX
    if (thumbRef.current) thumbRef.current.style.transition = 'none'
  }

  function onTouchMove(e) {
    if (!dragging.current || !thumbRef.current) return
    const delta = e.touches[0].clientX - startX.current
    const t = travel()
    const pos = tracking
      ? Math.min(Math.max(t + delta, 0), t)
      : Math.min(Math.max(delta, 0), t)
    thumbRef.current.style.transform = `translateX(${pos}px)`
  }

  function onTouchEnd(e) {
    if (!dragging.current) return
    dragging.current = false
    const delta = e.changedTouches[0].clientX - startX.current
    const t = travel()
    const done = tracking ? delta <= -(t * 0.72) : delta >= t * 0.72

    if (done) {
      thumbRef.current.style.transition = 'transform 0.12s ease'
      thumbRef.current.style.transform = tracking ? 'translateX(0px)' : `translateX(${t}px)`
      setBusy(true)
      setTimeout(() => { tracking ? onStop() : onStart() }, 140)
      return
    }

    // Snap back with spring
    thumbRef.current.style.transition = 'transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1)'
    thumbRef.current.style.transform = tracking ? `translateX(${t}px)` : 'translateX(0px)'
  }

  const trackColor = disabled ? '#dadce0' : tracking ? '#ea4335' : '#1a73e8'
  const thumbColor = disabled ? '#b0b0b0' : tracking ? '#b71c1c' : '#1557b0'
  const label = status === 'uploading' ? 'Saving…'
    : busy ? (tracking ? 'Stopping…' : 'Starting…')
    : tracking ? '← Slide to stop'
    : 'Slide to start →'

  return (
    <div
      ref={trackRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'relative',
        height: THUMB + PAD * 2,
        borderRadius: (THUMB + PAD * 2) / 2,
        background: trackColor,
        transition: 'background 0.3s',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
      }}
    >
      <span style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.88)', fontSize: 14, fontWeight: 600,
        pointerEvents: 'none', letterSpacing: '0.01em',
      }}>
        {label}
      </span>

      <div
        ref={thumbRef}
        style={{
          position: 'absolute', top: PAD, left: PAD,
          width: THUMB, height: THUMB, borderRadius: '50%',
          background: thumbColor,
          boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.3s',
          transform: 'translateX(0px)',
          willChange: 'transform',
          pointerEvents: 'none',
        }}
      >
        <span style={{ color: '#fff', fontSize: tracking ? 16 : 15, lineHeight: 1 }}>
          {tracking ? '■' : '▶'}
        </span>
      </div>
    </div>
  )
}
