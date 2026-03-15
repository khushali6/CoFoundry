import React, { useRef, useState } from 'react'
import { ExternalLink, Briefcase, Users, Code2, Linkedin, Lightbulb, Sparkles, Hexagon, Globe, Activity, MessageSquare, Copy, Check } from 'lucide-react'

export default function StartupCard({ startup, index, aiMode }) {
  const cardRef = useRef(null)
  const [activeDraft, setActiveDraft] = useState(null)
  const [copied, setCopied] = useState(false)
  
  const {
    name, source, website, description, techStack,
    jobs, employees, industry, brand_summary,
    potential_features, market_insight, similarity_score
  } = startup

  const handleMouseMove = (e) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    cardRef.current.style.setProperty('--mouse-x', `${x}px`)
    cardRef.current.style.setProperty('--mouse-y', `${y}px`)
  }

  const generateDraft = (founder) => {
    const draft = `Hi ${founder.name},\n\nI saw ${name} in the latest YC ${startup.batch || 'Batch'}. I was particularly impressed by your focus on ${industry || 'your sector'}.\n\nSpecifically, I'm tracking how you're addressing the ${market_insight?.split('.')[1] || 'current market challenges'}. Would love to connect and learn more about your journey building General Legal.\n\nBest,\n[Your Name]`;
    setActiveDraft({ founder, text: draft });
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(activeDraft.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div 
      ref={cardRef}
      className="depth-card glass-panel" 
      style={{ animationDelay: `${index * 0.08}s` }}
      onMouseMove={handleMouseMove}
    >
      <div className="card-luxury-glow" />

      {/* ── Draft Modal ── */}
      {activeDraft && (
        <div className="glass-panel" style={{ 
          position: 'absolute', 
          inset: '1.5rem', 
          zIndex: 50, 
          background: 'var(--bg-card-hover)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>MESSAGE DRAFT FOR {activeDraft.founder.name.toUpperCase()}</h4>
            <button onClick={() => setActiveDraft(null)} style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>×</button>
          </div>
          <textarea 
            readOnly
            value={activeDraft.text}
            style={{ 
              flex: 1, 
              background: 'var(--bg-input)', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: '12px',
              padding: '1rem',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              resize: 'none',
              fontFamily: 'inherit'
            }}
          />
          <button 
            onClick={copyToClipboard}
            style={{ 
              marginTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              background: 'var(--gradient-ai)',
              color: 'white',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.8rem'
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Draft & Open LinkedIn'}
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {startup.logo_url ? (
              <img 
                src={startup.logo_url} 
                alt={name} 
                className="startup-logo"
                style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'contain', background: '#fff', border: '1px solid var(--border-subtle)' }}
              />
            ) : (
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>
                {name.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="startup-name">{name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <span className="source-badge">{source}</span>
                {startup.batch && (
                  <span className="source-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>{startup.batch}</span>
                )}
                {similarity_score && (
                  <span className="score-badge">{(similarity_score * 100).toFixed(0)}% Match</span>
                )}
              </div>
            </div>
          </div>
          <Globe size={16} className="text-muted" style={{ opacity: 0.4 }} />
        </div>
      </div>
      {aiMode && similarity_score !== undefined && (
          <div className="ai-pill-btn active" style={{ height: 'auto', padding: '6px 12px', fontSize: '0.75rem', marginTop: '1rem' }}>
            <Sparkles size={12} />
            {(similarity_score * 100).toFixed(1)}% Match
          </div>
        )}

      {/* ── Industry ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem', marginTop: '1.5rem' }}>
        {industry && industry.split(',').map((tag, i) => (
          <span key={i} className="industry-badge">{tag.trim()}</span>
        ))}
      </div>

      {/* ── Description ── */}
      {description && (
        <p className="startup-desc">{description}</p>
      )}

      {/* ── AI Insights ── */}
      {(brand_summary || market_insight) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {brand_summary && (
            <div className="ai-insight-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: 'var(--primary)', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Sparkles size={12} /> Brand Identity
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{brand_summary}</p>
            </div>
          )}
          {market_insight && (
            <div className="ai-insight-panel" style={{ background: 'rgba(99, 102, 241, 0.03)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: 'var(--electric)', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Activity size={12} /> Strategic Insight
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{market_insight}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Team / Founders ── */}
      {employees && employees.length > 0 && (
        <div className="card-team-reveal">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>
            <Users size={12} /> Key Team
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {employees.map((e, i) => {
              const isFounder = e.role?.toLowerCase().includes('founder');
              return (
                <div key={i} className="glass-panel" style={{ 
                  padding: '6px 12px', 
                  borderRadius: '10px', 
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: isFounder ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border-subtle)',
                  background: isFounder ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                }}>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>{e.name}</span>
                  <span style={{ color: isFounder ? 'var(--primary)' : 'var(--text-muted)', fontWeight: isFounder ? 800 : 400, fontSize: '0.7rem' }}>
                    {isFounder ? '🏆 ' + e.role : e.role}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', marginLeft: '4px' }}>
                    {e.linkedin && (
                      <a href={e.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', opacity: 0.6 }}>
                        <Linkedin size={10} />
                      </a>
                    )}
                    {isFounder && (
                      <button 
                        onClick={() => generateDraft(e)}
                        style={{ color: 'var(--primary)', opacity: 0.6, cursor: 'pointer' }}
                        title="Draft LinkedIn Message"
                      >
                        <MessageSquare size={10} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Footer Stats/Meta ── */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {website && (
          <a href={website} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
            <ExternalLink size={14} />
            Launch Site
          </a>
        )}
        <div style={{ display: 'flex', gap: '12px' }}>
          {techStack && techStack.length > 0 && (
            <div title="Tech Stack Detect" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <Code2 size={14} /> {techStack.length}
            </div>
          )}
          {jobs && jobs.length > 0 && (
            <div title="Open Roles" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <Briefcase size={14} /> {jobs.length}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
