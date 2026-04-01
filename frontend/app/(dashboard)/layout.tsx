import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  let { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Auto-create profile if missing (handles new users without a DB trigger)
  if (!profileData) {
    const { data: created } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: user.email?.split('@')[0] ?? 'User',
        role: 'worker_standard',
        is_active: true,
      })
      .select('*')
      .single()
    profileData = created
  }

  // Inject email from auth session since profiles table has no email col
  const profile = profileData ? { ...profileData, email: user.email } : null

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', display: 'flex' }}>
      <Sidebar profile={profile} />
      <div style={{ marginLeft: '256px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header profile={profile} />
        <main
          style={{ paddingTop: '64px', flex: 1, overflowX: 'hidden' }}
          className="fade-in"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
