'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()
  const active = '#1a73e8'
  const inactive = '#9aa0a6'

  const tabs = [
    {
      href: '/',
      label: 'Tracking',
      icon: (c) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" fill={c}/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={c} strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="7" stroke={c} strokeWidth="1.5" strokeDasharray="2 3"/>
        </svg>
      ),
    },
    {
      href: '/log',
      label: 'Log Entry',
      icon: (c) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      href: '/trips',
      label: 'All Trips',
      icon: (c) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="16" rx="2" stroke={c} strokeWidth="1.8"/>
          <path d="M7 9h10M7 13h6" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', borderTop: '1px solid #e8eaed', background: '#fff', flexShrink: 0 }}>
      {tabs.map(tab => {
        const isActive = pathname === tab.href
        const color = isActive ? active : inactive
        return (
          <Link key={tab.href} href={tab.href} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '10px 0 18px', textDecoration: 'none', gap: 3,
          }}>
            {tab.icon(color)}
            <span style={{ fontSize: 10, color, fontWeight: isActive ? 600 : 400 }}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
