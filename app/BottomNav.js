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
      href: '/trips',
      label: 'All Trips',
      icon: (c) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="16" rx="2" stroke={c} strokeWidth="1.8"/>
          <path d="M7 9h10M7 13h6" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      href: '/more',
      label: 'More',
      icon: (c) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="5" cy="12" r="1.5" fill={c}/>
          <circle cx="12" cy="12" r="1.5" fill={c}/>
          <circle cx="19" cy="12" r="1.5" fill={c}/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', borderTop: '1px solid #e8eaed', background: '#fff', flexShrink: 0 }}>
      {tabs.map(tab => {
        const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
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
