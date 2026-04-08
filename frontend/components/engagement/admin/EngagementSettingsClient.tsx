'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateEngagementConfig } from '@/app/actions/engagement'
import type { EngagementConfig } from '@/types/engagement'

interface Props {
  configs: EngagementConfig[]
  configError?: boolean
}

const CONFIG_META: Record<string, { label: string; description: string; type: 'number' | 'text'; min?: number; max?: number }> = {
  default_daily_target: { label: 'Daily Submission Target', description: 'Number of proofs each operator should submit per day.', type: 'number', min: 1, max: 100 },
  submission_expiry_hours: { label: 'Submission Expiry (hours)', description: 'How many hours before a submission proof link expires. Set 0 to disable.', type: 'number', min: 0, max: 8760 },
  max_file_size_mb: { label: 'Max File Size (MB)', description: 'Maximum proof file size in megabytes (max 10).', type: 'number', min: 1, max: 10 },
  allowed_resubmits: { label: 'Resubmit Limit', description: 'Max times an operator can resubmit a rejected proof. Set 0 for unlimited.', type: 'number', min: 0, max: 20 },
}

function buildInitialValues(configs: EngagementConfig[]): Record<string, string> {
  const defaults: Record<string, string> = {
    default_daily_target: '10',
    submission_expiry_hours: '24',
    max_file_size_mb: '10',
    allowed_resubmits: '0',
  }
  for (const cfg of configs) {
    defaults[cfg.config_key] = cfg.config_value
  }
  return defaults
}

export function EngagementSettingsClient({ configs, configError }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [values, setValues] = useState<Record<string, string>>(() => buildInitialValues(configs))
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState('')
  const [error, setError] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleChange = (key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }))
    setDirtyKeys(prev => new Set([...prev, key]))
  }

  const handleSaveAll = () => {
    setError(null)
    const keys = [...dirtyKeys]
    if (keys.length === 0) { showToast('No changes to save'); return }

    startTransition(async () => {
      for (const key of keys) {
        const result = await updateEngagementConfig(key, values[key] ?? '')
        if (!result.success) {
          setError('error' in result ? result.error : `Failed to save ${key}`)
          return
        }
      }
      setDirtyKeys(new Set())
      showToast('Settings saved')
      router.refresh()
    })
  }

  const handleSaveOne = (key: string) => {
    setError(null)
    startTransition(async () => {
      const result = await updateEngagementConfig(key, values[key] ?? '')
      if (!result.success) { setError('error' in result ? result.error : 'Save failed'); return }
      setDirtyKeys(prev => { const n = new Set(prev); n.delete(key); return n })
      showToast(`Saved: ${CONFIG_META[key]?.label ?? key}`)
      router.refresh()
    })
  }

  const knownKeys = Object.keys(CONFIG_META)
  const unknownConfigs = configs.filter(c => !knownKeys.includes(c.config_key))

  return (
    <div data-testid="engagement-settings-client" style={{ maxWidth: '640px' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '1.25rem', right: '1.5rem', zIndex: 9998, background: '#22C55E', color: '#000', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', padding: '0.55rem 1rem', letterSpacing: '0.05em' }}>
          {toast}
        </div>
      )}

      {/* Config missing warning */}
      {configError && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid #F59E0B', color: '#F59E0B', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', padding: '0.75rem 1rem', marginBottom: '1.25rem', letterSpacing: '0.08em' }}>
          CONFIG WARNING: Some settings are missing from the database. Values shown are fallback defaults. Save to persist them.
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(204,31,31,0.1)', border: '1px solid #CC1F1F', color: '#CC1F1F', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', padding: '0.65rem 1rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Known config fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        {knownKeys.map(key => {
          const meta = CONFIG_META[key]!
          const isDirty = dirtyKeys.has(key)
          return (
            <div key={key} style={{ background: '#111111', border: `1px solid ${isDirty ? '#CC1F1F' : '#2A2A2A'}`, padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#FFFFFF', letterSpacing: '0.05em' }}>
                    {meta.label}
                    {isDirty && <span style={{ color: '#CC1F1F', marginLeft: '0.4rem', fontSize: '0.6rem' }}>UNSAVED</span>}
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#555555', marginTop: '0.2rem' }}>
                    {meta.description}
                  </div>
                </div>
                {isDirty && (
                  <button
                    onClick={() => handleSaveOne(key)}
                    disabled={isPending}
                    data-testid={`save-config-${key}`}
                    style={{ background: 'transparent', border: '1px solid #CC1F1F', color: '#CC1F1F', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', letterSpacing: '0.1em', padding: '0.25rem 0.6rem', cursor: isPending ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}
                  >
                    SAVE
                  </button>
                )}
              </div>
              <input
                type={meta.type}
                min={meta.min}
                max={meta.max}
                value={values[key] ?? ''}
                onChange={e => handleChange(key, e.target.value)}
                data-testid={`config-input-${key}`}
                style={{ width: '160px', background: '#0E0E0E', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', padding: '0.45rem 0.75rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )
        })}
      </div>

      {/* Unknown configs (passthrough editor) */}
      {unknownConfigs.length > 0 && (
        <div style={{ background: '#0E0E0E', border: '1px solid #1A1A1A', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#555555', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Additional Config Keys
          </div>
          {unknownConfigs.map(cfg => (
            <div key={cfg.config_key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', minWidth: '200px' }}>{cfg.config_key}</span>
              <input
                value={values[cfg.config_key] ?? cfg.config_value}
                onChange={e => handleChange(cfg.config_key, e.target.value)}
                style={{ flex: 1, background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', padding: '0.4rem 0.6rem', outline: 'none' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Save all button */}
      <button
        onClick={handleSaveAll}
        disabled={isPending || dirtyKeys.size === 0}
        data-testid="save-all-config-btn"
        style={{ background: isPending || dirtyKeys.size === 0 ? '#1A1A1A' : '#CC1F1F', border: 'none', color: isPending || dirtyKeys.size === 0 ? '#444' : '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.15em', padding: '0.75rem 2rem', cursor: isPending || dirtyKeys.size === 0 ? 'not-allowed' : 'pointer', transition: 'background 150ms' }}
      >
        {isPending ? 'SAVING...' : `SAVE ALL CHANGES${dirtyKeys.size > 0 ? ` (${dirtyKeys.size})` : ''}`}
      </button>
    </div>
  )
}
