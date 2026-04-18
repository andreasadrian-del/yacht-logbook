'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import WayLogIcon from '../WayLogIcon'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError('Invalid email or password.'); return }
    router.push('/')
  }

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', padding: '0 24px' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <WayLogIcon size={56} instanceId="login" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#202124', margin: 0, letterSpacing: '-0.3px' }}>Way Log</h1>
          <p style={{ fontSize: 14, color: '#5f6368', margin: '6px 0 0' }}>GPS trip tracker for your yacht</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#202124', marginBottom: 8 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            style={{
              width: '100%', padding: '12px 14px', fontSize: 16, borderRadius: 10,
              border: '1px solid #e8eaed', outline: 'none', marginBottom: 16,
              boxSizing: 'border-box', color: '#202124',
            }}
          />
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#202124', marginBottom: 8 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            style={{
              width: '100%', padding: '12px 14px', fontSize: 16, borderRadius: 10,
              border: '1px solid #e8eaed', outline: 'none', marginBottom: 16,
              boxSizing: 'border-box', color: '#202124',
            }}
          />
          {error && (
            <p style={{ fontSize: 13, color: '#ea4335', margin: '-8px 0 16px' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              width: '100%', padding: '14px', fontSize: 16, fontWeight: 600,
              borderRadius: 10, border: 'none', cursor: loading ? 'wait' : 'pointer',
              background: loading || !email || !password ? '#e8eaed' : '#1a73e8',
              color: loading || !email || !password ? '#9aa0a6' : '#fff',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
