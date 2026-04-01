'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Invalid credentials. Check your email and password.')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: '#0A0A0A' }}
    >
      {/* Left Panel - Login Form */}
      <div className="flex flex-col justify-center px-10 lg:px-20 w-full lg:w-[520px] z-10 relative">
        {/* Logo */}
        <div className="mb-12 flex items-center gap-4">
          <img
            src="/zmm-flame.png"
            alt="ZMM"
            className="h-10 w-10 object-contain"
          />
          <div>
            <div
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.15em', fontSize: '1.25rem', color: '#FFFFFF' }}
            >
              ZAMOTOMOTO TV
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
              Media Operations System
            </div>
          </div>
        </div>

        {/* Heading */}
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '3.5rem', letterSpacing: '0.05em', color: '#FFFFFF', marginBottom: '0.25rem', lineHeight: 1 }}>
          SIGN IN
        </h1>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#888888', marginBottom: '2rem' }}>
          Enter your credentials to access the control room.
        </p>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ maxWidth: '380px' }}>
          {/* Email */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="email"
              style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem' }}
            >
              Email Address
            </label>
            <input
              id="email"
              data-testid="login-email-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="operator@zamotomoto.tv"
              style={{
                width: '100%',
                background: '#1A1A1A',
                border: '1px solid #2A2A2A',
                color: '#FFFFFF',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.85rem',
                padding: '0.75rem 1rem',
                outline: 'none',
                borderRadius: 0,
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="password"
              style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem' }}
            >
              Password
            </label>
            <input
              id="password"
              data-testid="login-password-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••••••"
              style={{
                width: '100%',
                background: '#1A1A1A',
                border: '1px solid #2A2A2A',
                color: '#FFFFFF',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.85rem',
                padding: '0.75rem 1rem',
                outline: 'none',
                borderRadius: 0,
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              data-testid="login-error"
              style={{
                background: 'rgba(204,31,31,0.1)',
                border: '1px solid rgba(204,31,31,0.4)',
                color: '#FF2B2B',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.75rem',
                padding: '0.6rem 1rem',
                marginBottom: '1rem',
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            data-testid="login-submit-button"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#1A0000' : '#CC1F1F',
              border: 'none',
              color: '#FFFFFF',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '1.1rem',
              letterSpacing: '0.15em',
              padding: '0.85rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 150ms',
              borderRadius: 0,
            }}
            onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.background = '#FF2B2B' }}
            onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.background = '#CC1F1F' }}
          >
            {loading ? 'AUTHENTICATING...' : 'ACCESS CONTROL ROOM'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ marginTop: '3rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#444444', letterSpacing: '0.1em' }}>
          ZAMOTOMOTO TV — INTERNAL SYSTEM v1.0
        </div>
      </div>

      {/* Right Panel - Background Image */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <img
          src="https://static.prod-images.emergentagent.com/jobs/212c0901-c46c-4a3a-8cf1-5d074fdf4df5/images/ee0cfe09ccc9a74c43f40cad255a078591e8047f812ab46a2be64c9bf4dc0a41.png"
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }}
        />
        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, #0A0A0A 0%, transparent 40%)',
          }}
        />
        {/* Brand text overlay */}
        <div style={{ position: 'absolute', bottom: '2rem', right: '2rem', textAlign: 'right' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '4rem', color: 'rgba(255,255,255,0.07)', letterSpacing: '0.1em', lineHeight: 1 }}>
            ZAMOTOMOTO
          </div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '4rem', color: 'rgba(204,31,31,0.15)', letterSpacing: '0.1em', lineHeight: 1 }}>
            TV
          </div>
        </div>
        {/* Top label */}
        <div style={{
          position: 'absolute',
          top: '2rem',
          right: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <div className="live-dot" style={{ width: '6px', height: '6px', background: '#CC1F1F', borderRadius: '9999px' }} />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#CC1F1F', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
            LIVE BROADCAST
          </span>
        </div>
      </div>
    </div>
  )
}
