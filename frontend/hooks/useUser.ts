'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface UseUserReturn {
  profile: Profile | null
  isAdminOrAbove: boolean
  isSuperAdmin: boolean
  isLoading: boolean
}

export function useUser(): UseUserReturn {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          if (data) {
            // Inject email from auth.users since profiles table has no email col
            setProfile({ ...data, email: user.email })
          }
        }
      } catch (err) {
        console.error('useUser error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchUser()
      else { setProfile(null); setIsLoading(false) }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return {
    profile,
    isAdminOrAbove: profile?.role === 'super_admin' || profile?.role === 'admin',
    isSuperAdmin: profile?.role === 'super_admin',
    isLoading,
  }
}
