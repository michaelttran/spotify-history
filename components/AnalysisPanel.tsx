'use client'

import { useState } from 'react'
import { Play, CheckCircle, AlertCircle } from 'lucide-react'

const SECTIONS = [
  { id: 'summary',    num: '01', label: 'Summary',    fullLabel: 'High-Level Summary',          desc: 'Overall psychological + cultural profile' },
  { id: 'years',      num: '02', label: 'Years',      fullLabel: 'Era Analysis',                 desc: 'Year-by-year emotional breakdown, 2013–2026' },
  { id: 'patterns',   num: '03', label: 'Patterns',   fullLabel: 'Psychological Patterns',       desc: 'Recurring loops, hidden trends, emotional signatures' },
  { id: 'artists',    num: '04', label: 'Artists',    fullLabel: 'Artist Analysis',              desc: 'Loyalty, life phases, contradictions' },
  { id: 'archetypes', num: '05', label: 'Archetypes', fullLabel: 'Emotional Archetypes',         desc: 'The characters living in your taste' },
  { id: 'psych',      num: '06', label: 'Psych',      fullLabel: 'Final Psychological Read',     desc: 'Direct, unfiltered, no flattery' },
  { id: 'insights',   num: '07', label: 'Insights',   fullLabel: 'Most Interesting Insights',    desc: 'Bold reads on the full 13-year dataset' },
]

function renderMarkdown(text: string) {
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n+/g, '</p><p>')
    .replace(/^(?!<[hublp])(.+)$/gm, (m) => m.trim() ? `<p>${m}</p>` : '')
}

export function AnalysisPanel() {
  const [active, setActive] = useState('summary')
  const [outputs, setOutputs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<Record<string, string>>({})

  const run = async (sectionId: string) => {
    if (loading[sectionId] || done[sectionId]) return
    setLoading(l => ({ ...l, [sectionId]: true }))
    setOutputs(o => ({ ...o, [sectionId]: '' }))
    setError(e => ({ ...e, [sectionId]: '' }))

    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: sectionId }),
      })
      if (!res.ok) throw new Error(await res.text())

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done: d, value } = await reader.read()
        if (d) break
        full += decoder.decode(value, { stream: true })
        setOutputs(o => ({ ...o, [sectionId]: full }))
      }

      setDone(d => ({ ...d, [sectionId]: true }))
    } catch (e: any) {
      setError(err => ({ ...err, [sectionId]: e.message }))
    } finally {
      setLoading(l => ({ ...l, [sectionId]: false }))
    }
  }

  const section = SECTIONS.find(s => s.id === active)!
  const output = outputs[active] ?? ''
  const isLoading = loading[active]
  const isDone = done[active]
  const hasError = error[active]

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 16,
      border: '1px solid var(--border)',
      overflow: 'hidden',
      boxShadow: '0 4px 28px rgba(0,0,0,0.3)',
    }}>

      {/* Pill navigation */}
      <div style={{
        padding: '1rem 1.25rem',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(8,8,8,0.6)',
        display: 'flex',
        gap: 4,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      } as React.CSSProperties}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={`analysis-pill${s.id === active ? ' active' : ''}`}
            onClick={() => { setActive(s.id); run(s.id) }}
          >
            <span style={{
              fontSize: '0.58rem',
              fontFamily: 'DM Mono, monospace',
              letterSpacing: '0.04em',
              opacity: 0.55,
            }}>
              {s.num}
            </span>
            {s.label}
            {done[s.id] && (
              <CheckCircle size={9} style={{ color: 'var(--green)', flexShrink: 0 }} />
            )}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div style={{ padding: '2rem 2.25rem 2.5rem', minHeight: 440, maxHeight: 640, overflowY: 'auto' }}>

        {/* Section header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <p style={{
              fontSize: '0.58rem',
              color: 'var(--accent)',
              fontFamily: 'DM Mono, monospace',
              letterSpacing: '0.22em',
              marginBottom: 7,
            }}>
              {section.num} — ANALYSIS
            </p>
            <h3 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.3rem',
              fontWeight: 400,
              color: 'var(--text)',
              letterSpacing: '-0.01em',
              marginBottom: 5,
            }}>
              {section.fullLabel}
            </h3>
            <p style={{ fontSize: '0.73rem', color: 'var(--muted2)', fontStyle: 'italic' }}>
              {section.desc}
            </p>
          </div>

          {!isDone && !isLoading && (
            <button
              onClick={() => run(active)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '0.5rem 1.125rem',
                borderRadius: 999,
                background: 'var(--accent)',
                color: '#0a0a0a',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.82' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              <Play size={11} fill="currentColor" />
              Run
            </button>
          )}
          {isLoading && (
            <span style={{
              fontSize: '0.7rem',
              color: 'var(--muted2)',
              fontFamily: 'DM Mono, monospace',
              letterSpacing: '0.08em',
            }}>
              analyzing...
            </span>
          )}
        </div>

        {/* Error */}
        {hasError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '0.75rem 1rem', borderRadius: 10,
            background: 'rgba(200,123,123,0.07)',
            border: '1px solid rgba(200,123,123,0.15)',
            color: 'var(--red)', fontSize: '0.8rem',
          }}>
            <AlertCircle size={13} /> {hasError}
          </div>
        )}

        {/* Empty state */}
        {!output && !isLoading && !hasError && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: 200, gap: 10,
          }}>
            <p style={{
              fontFamily: 'Playfair Display, serif',
              fontStyle: 'italic',
              fontSize: '0.95rem',
              color: 'var(--muted)',
            }}>
              Click Run to generate analysis
            </p>
            <p style={{ fontSize: '0.62rem', color: 'var(--muted)', fontFamily: 'DM Mono, monospace' }}>
              powered by claude · based on 487,240 plays
            </p>
          </div>
        )}

        {/* Output */}
        {output && (
          <div
            className="analysis-body fade-in"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(output) + (isLoading ? '<span class="cursor"></span>' : '')
            }}
          />
        )}
      </div>
    </div>
  )
}
