'use client'

import { supabase } from '@/lib/supabase'

export default function SignOutButton() {
  return (
    <button
      onClick={() => supabase.auth.signOut().then(() => { window.location.href = '/login' })}
      className="text-[#007AFF] text-[15px] w-16 text-right"
    >
      Sign out
    </button>
  )
}
