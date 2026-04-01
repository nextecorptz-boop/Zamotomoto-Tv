import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import type { SpecialProject } from '@/types'

export default async function SpecialProjectsPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('special_projects')
    .select('*')
    .order('created_at', { ascending: false })

  const projectList = (projects || []) as SpecialProject[]

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0 }}>Special Projects</h2>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.15em', color: '#CC1F1F', border: '1px solid #CC1F1F', padding: '0.15rem 0.5rem', textTransform: 'uppercase' }}>
              EXEC URGENCY
            </span>
          </div>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#888888', margin: 0 }}>Breaking news coordination — executive projects</p>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#888888', background: '#111111', border: '1px solid #2A2A2A', padding: '0.5rem 1rem' }}>
          {projectList.length} projects
        </div>
      </div>

      {/* Projects Grid */}
      {projectList.length === 0 ? (
        <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '3rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#444444' }}>
          No special projects
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#2A2A2A' }}>
          {projectList.map(project => {
            const urgencyColor = project.urgency === 'urgent' ? '#CC1F1F' : project.urgency === 'high' ? '#F59E0B' : project.urgency === 'low' ? '#888888' : '#22C55E'
            return (
              <div
                key={project.id}
                data-testid={`special-project-${project.id}`}
                className="card-tilt"
                style={{
                  background: '#111111',
                  padding: '1.25rem 1.5rem',
                  borderLeft: `3px solid ${urgencyColor}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.05em', color: '#FFFFFF' }}>
                      {project.title}
                    </span>
                    {project.urgency === 'urgent' && (
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', letterSpacing: '0.15em', color: '#CC1F1F', border: '1px solid #CC1F1F', padding: '0.1rem 0.35rem', background: 'rgba(204,31,31,0.1)' }}>
                        URGENT
                      </span>
                    )}
                  </div>
                  {project.description && (
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#888888', margin: '0 0 0.5rem 0', lineHeight: 1.5 }}>
                      {project.description}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end', flexShrink: 0 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: urgencyColor, border: `1px solid ${urgencyColor}`, padding: '0.15rem 0.5rem' }}>
                    {project.status?.replace('_', ' ')}
                  </span>
                  {project.deadline && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888' }}>
                      {formatDate(project.deadline)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
