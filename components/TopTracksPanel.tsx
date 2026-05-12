'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Track {
  track_name: string
  artist_name: string
  plays: number
  hours: number
  spotify_track_uri: string
}

interface TrackStats {
  total_plays: number
  total_ms: number
  first_play: string
  last_play: string
  skip_rate: number
  peak_hour: number
  peak_month: string
  peak_month_plays: number
  by_year: { year: number; plays: number }[]
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toHourLabel(h: number) {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

function getInsight(stats: TrackStats, rank: number): string {
  const days = stats.total_ms / 86400000
  const skip = (stats.skip_rate ?? 0) * 100
  const h = stats.peak_hour ?? 12
  const isNight = h >= 22 || h <= 3
  const years = stats.by_year?.length ?? 0

  if (rank === 1 && skip < 5) {
    return `Your #1 track across 13 years, and you almost never skip it. Some attachments don't need explaining.`
  }
  if (days > 20) {
    return `${days.toFixed(1)} continuous days of audio. This isn't casual listening — it's emotional infrastructure.`
  }
  if (isNight && skip < 5) {
    return `Almost never skipped, almost always after midnight. A certified late-night companion.`
  }
  if (skip < 3) {
    return `You almost never skip this. You let it run every single time.`
  }
  if (isNight) {
    return `Most listens happen after ${toHourLabel(h)}. A song for the hours between days.`
  }
  return `${stats.total_plays.toLocaleString()} plays across ${years} years — a steady presence through an entire era of your life.`
}

function MetaItem({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p style={{ fontSize: '0.58rem', color: 'var(--muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.14em', marginBottom: 3 }}>
        {label}
      </p>
      <p style={{ fontSize: '0.8rem', color: accent ? 'var(--accent)' : 'var(--text2)', fontFamily: 'DM Mono, monospace' }}>
        {value}
      </p>
    </div>
  )
}

function BigStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.025em', lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: '0.62rem', color: 'var(--muted2)', fontFamily: 'DM Mono, monospace', marginTop: 4 }}>
        {label}
      </p>
    </div>
  )
}

function TrackDetail({ stats, rank }: { stats: TrackStats; rank: number }) {
  const hours = stats.total_ms / 3600000
  const days = stats.total_ms / 86400000
  const skipPct = ((stats.skip_rate ?? 0) * 100).toFixed(1)
  const insight = getInsight(stats, rank)
  const peakYear = stats.by_year?.reduce(
    (a, b) => (b.plays > a.plays ? b : a),
    stats.by_year[0]
  )
  const spanYears = stats.first_play && stats.last_play
    ? ((new Date(stats.last_play).getTime() - new Date(stats.first_play).getTime()) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1)
    : null

  return (
    <div className="fade-in" style={{
      padding: '1.5rem 1.5rem 1.75rem',
      background: 'rgba(200,169,110,0.02)',
      borderTop: '1px solid rgba(200,169,110,0.1)',
    }}>

      {/* Big stats row */}
      <div style={{
        display: 'flex', gap: '2.5rem', marginBottom: '1.5rem',
        paddingBottom: '1.25rem', borderBottom: '1px solid var(--border)',
      }}>
        <BigStat value={stats.total_plays.toLocaleString()} label="total plays" />
        <BigStat value={`${Math.round(hours).toLocaleString()}h`} label="listened" />
        <BigStat value={`${days.toFixed(1)} days`} label="of audio, straight" />
        {peakYear && <BigStat value={String(peakYear.year)} label={`peak year · ${peakYear.plays.toLocaleString()} plays`} />}
      </div>

      {/* Two-col: meta + chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '2rem', marginBottom: '1.25rem' }}>

        {/* Left: timeline metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <MetaItem label="FIRST PLAYED" value={stats.first_play ? fmt(stats.first_play) : '—'} />
          <MetaItem label="LAST PLAYED" value={stats.last_play ? fmt(stats.last_play) : '—'} />
          {spanYears && <MetaItem label="ACTIVE SPAN" value={`${spanYears} years`} />}
          {stats.peak_month && (
            <MetaItem
              label="PEAK MONTH"
              value={`${stats.peak_month} · ${stats.peak_month_plays?.toLocaleString()} plays`}
            />
          )}
          <MetaItem label="PEAK HOUR" value={stats.peak_hour != null ? toHourLabel(stats.peak_hour) : '—'} />
          <MetaItem label="SKIP RATE" value={`${skipPct}%`} accent={parseFloat(skipPct) < 5} />
        </div>

        {/* Right: plays by year chart */}
        <div>
          <p style={{
            fontSize: '0.58rem', color: 'var(--muted)', fontFamily: 'DM Mono, monospace',
            letterSpacing: '0.14em', marginBottom: 10,
          }}>
            PLAYS PER YEAR
          </p>
          {stats.by_year?.length > 0 && (
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={stats.by_year} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 9, fill: '#525252', fontFamily: 'DM Mono, monospace' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#181818', border: '1px solid #2a2a2a',
                    borderRadius: 8, fontSize: 11, fontFamily: 'DM Mono, monospace',
                  }}
                  labelStyle={{ color: '#e8e4dc', marginBottom: 4 }}
                  itemStyle={{ color: '#c8a96e' }}
                  formatter={(v: any) => [v.toLocaleString(), 'plays']}
                />
                <Bar dataKey="plays" radius={[3, 3, 0, 0]}>
                  {stats.by_year.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.year === peakYear?.year
                        ? '#c8a96e'
                        : `rgba(200,169,110,${0.12 + (d.plays / (peakYear?.plays ?? 1)) * 0.5})`
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Insight line */}
      <p style={{
        fontFamily: 'Playfair Display, serif',
        fontStyle: 'italic',
        fontSize: '0.875rem',
        color: 'var(--muted2)',
        lineHeight: 1.7,
        borderTop: '1px solid var(--border)',
        paddingTop: '1.125rem',
      }}>
        "{insight}"
      </p>
    </div>
  )
}

export function TopTracksPanel({ tracks }: { tracks: Track[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [stats, setStats] = useState<Record<string, TrackStats | 'loading' | 'error'>>({})

  const toggle = async (uri: string) => {
    if (!uri) return
    if (expanded === uri) { setExpanded(null); return }
    setExpanded(uri)
    if (stats[uri]) return

    setStats(s => ({ ...s, [uri]: 'loading' }))
    try {
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri }),
      })
      const data = await res.json()
      setStats(s => ({ ...s, [uri]: data }))
    } catch {
      setStats(s => ({ ...s, [uri]: 'error' }))
    }
  }

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 16,
      border: '1px solid var(--border)',
      overflow: 'hidden',
      boxShadow: '0 4px 28px rgba(0,0,0,0.3)',
    }}>
      {tracks.map((t, i) => {
        const uri = t.spotify_track_uri
        const isExpanded = expanded === uri
        const trackStats = stats[uri]

        return (
          <div key={i} style={{ borderBottom: i < tracks.length - 1 || isExpanded ? '1px solid var(--border)' : 'none' }}>

            {/* Track row */}
            <div
              className="track-row"
              style={{ cursor: 'pointer', background: isExpanded ? 'rgba(200,169,110,0.04)' : undefined }}
              onClick={() => toggle(uri)}
            >
              <span style={{
                fontSize: '0.65rem', color: 'var(--muted)',
                fontFamily: 'DM Mono, monospace', width: 22, textAlign: 'right', flexShrink: 0,
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: '0.875rem', color: 'var(--text)', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {t.track_name}
                </p>
                <p style={{ fontSize: '0.73rem', color: 'var(--muted2)', marginTop: 2 }}>{t.artist_name}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--accent)', fontFamily: 'DM Mono, monospace' }}>
                  {t.plays?.toLocaleString()}
                </p>
                <p style={{ fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.08em' }}>PLAYS</p>
              </div>
              <div style={{ width: 68, height: 3, borderRadius: 2, background: 'var(--border2)', flexShrink: 0 }}>
                <div style={{
                  height: '100%', borderRadius: 2, background: 'var(--accent)',
                  width: `${(t.plays / (tracks[0]?.plays ?? 1)) * 100}%`,
                  opacity: 0.45 + (t.plays / (tracks[0]?.plays ?? 1)) * 0.55,
                }} />
              </div>
              <div style={{ flexShrink: 0, color: isExpanded ? 'var(--accent)' : 'var(--muted)', transition: 'color 0.2s' }}>
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              trackStats === 'loading' ? (
                <div style={{
                  padding: '1.5rem', color: 'var(--muted)', fontSize: '0.72rem',
                  fontFamily: 'DM Mono, monospace', borderTop: '1px solid var(--border)',
                }}>
                  loading...
                </div>
              ) : trackStats === 'error' ? (
                <div style={{
                  padding: '1.5rem', color: 'var(--red)', fontSize: '0.72rem',
                  fontFamily: 'DM Mono, monospace', borderTop: '1px solid var(--border)',
                }}>
                  failed to load stats
                </div>
              ) : trackStats ? (
                <TrackDetail stats={trackStats} rank={i + 1} />
              ) : null
            )}
          </div>
        )
      })}
    </div>
  )
}
