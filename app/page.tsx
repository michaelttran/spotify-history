import { createClient } from '@supabase/supabase-js'
import { StatCard } from '@/components/StatCard'
import { YearlyChart } from '@/components/YearlyChart'
import { TopArtistsChart } from '@/components/TopArtistsChart'
import { HourlyHeatmap } from '@/components/HourlyHeatmap'
import { SkipRateChart } from '@/components/SkipRateChart'
import { AnalysisPanel } from '@/components/AnalysisPanel'
import { TopTracksPanel } from '@/components/TopTracksPanel'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

async function getData() {
  const [yearly, topArtists, topTracks, hourly, skipRate] = await Promise.all([
    supabase.rpc('plays_per_year'),
    supabase.rpc('top_artists', { limit_n: 20 }),
    supabase.rpc('top_tracks', { limit_n: 10 }),
    supabase.rpc('hourly_heatmap'),
    supabase.rpc('skip_rate_by_year'),
  ])
  return {
    yearly: yearly.data ?? [],
    topArtists: topArtists.data ?? [],
    topTracks: topTracks.data ?? [],
    hourly: hourly.data ?? [],
    skipRate: skipRate.data ?? [],
  }
}

function SectionHeader({ num, title, sub }: { num: string; title: string; sub: string }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <p style={{
        fontSize: '0.6rem',
        color: 'var(--accent)',
        fontFamily: 'DM Mono, monospace',
        letterSpacing: '0.22em',
        marginBottom: 8,
      }}>{num}</p>
      <h2 style={{
        fontFamily: 'Playfair Display, serif',
        fontWeight: 400,
        fontSize: '1.4rem',
        letterSpacing: '-0.015em',
        lineHeight: 1.15,
        color: 'var(--text)',
      }}>{title}</h2>
      <p style={{
        fontSize: '0.7rem',
        color: 'var(--muted2)',
        fontFamily: 'DM Mono, monospace',
        marginTop: 5,
        fontStyle: 'italic',
      }}>{sub}</p>
    </div>
  )
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  borderRadius: 16,
  border: '1px solid var(--border)',
  boxShadow: '0 4px 28px rgba(0,0,0,0.3)',
}

export default async function Home() {
  const { yearly, topArtists, topTracks, hourly, skipRate } = await getData()

  const totalPlays = yearly.reduce((s: number, y: any) => s + (y.plays ?? 0), 0)
  const totalHours = yearly.reduce((s: number, y: any) => s + (y.hours_played ?? 0), 0)
  const totalDays = Math.round(totalHours / 24)
  const peakYear = yearly.reduce((a: any, b: any) => (b.plays > a.plays ? b : a), yearly[0] ?? {})

  // Derive insight chips from data
  const hourTotals = Array(24).fill(0)
  hourly.forEach((h: any) => { hourTotals[h.hour] += h.plays })
  const peakHour: number = hourTotals.reduce(
    (maxI: number, v: number, i: number, arr: number[]) => (v > arr[maxI] ? i : maxI), 0
  )
  const peakHourLabel = peakHour === 0 ? '12am'
    : peakHour < 12 ? `${peakHour}am`
    : peakHour === 12 ? '12pm'
    : `${peakHour - 12}pm`
  const timeOfDay = (peakHour >= 22 || peakHour <= 3) ? 'Night Listener'
    : (peakHour >= 4 && peakHour <= 9) ? 'Morning Ritual'
    : (peakHour >= 10 && peakHour <= 16) ? 'Afternoon Listener'
    : 'Evening Listener'

  const avgSkipRate = skipRate.length
    ? skipRate.reduce((s: number, y: any) => s + (y.skip_rate ?? 0), 0) / skipRate.length
    : 0
  const skipPersonality = avgSkipRate < 0.08 ? 'Deep Listener'
    : avgSkipRate < 0.18 ? 'Selective Listener'
    : 'Picky Listener'

  const chips = [
    { label: timeOfDay, sub: `peaks at ${peakHourLabel}` },
    { label: skipPersonality, sub: `${(avgSkipRate * 100).toFixed(0)}% avg skip rate` },
    { label: `${peakYear?.year ?? '—'} — Peak Era`, sub: `${peakYear?.plays?.toLocaleString() ?? '—'} plays` },
    ...(topArtists?.[0] ? [{ label: topArtists[0].artist_name, sub: 'most played artist' }] : []),
    ...(topTracks?.[0] ? [{ label: topTracks[0].track_name, sub: topTracks[0].artist_name }] : []),
    { label: `${totalDays} Days of Audio`, sub: 'end to end' },
    { label: '13 Years of History', sub: 'April 2013 — May 2026' },
  ]

  const dot = (
    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border2)', display: 'inline-block', flexShrink: 0 }} />
  )

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <header style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border)', padding: '5.5rem 2.5rem 4.5rem' }}>
        {/* Ambient glows */}
        <div style={{
          position: 'absolute', top: -200, right: -140,
          width: 720, height: 720, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(200,169,110,0.11) 0%, rgba(200,169,110,0.02) 45%, transparent 70%)',
          animation: 'ambient-pulse 14s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: -160, left: -80,
          width: 480, height: 480, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(155,123,200,0.055) 0%, transparent 65%)',
          animation: 'ambient-pulse 18s ease-in-out infinite reverse',
        }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <p style={{ fontSize: '0.6rem', color: 'var(--accent)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.25em', marginBottom: '1.5rem' }}>
            SPOTIFY · EXTENDED STREAMING HISTORY
          </p>
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(2.8rem, 7vw, 5.25rem)',
            fontWeight: 400,
            color: 'var(--text)',
            letterSpacing: '-0.025em',
            lineHeight: 1.0,
            marginBottom: '1.25rem',
          }}>
            Listening<br />History
          </h1>
          <p style={{
            fontFamily: 'Playfair Display, serif',
            fontStyle: 'italic',
            fontSize: '1.05rem',
            color: 'var(--muted2)',
            maxWidth: 400,
            lineHeight: 1.75,
            marginBottom: '2.5rem',
          }}>
            Thirteen years of sound, ritual,<br />obsession, and emotional weather.
          </p>
          <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.67rem', color: 'var(--muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em' }}>
              APRIL 2013 — MAY 2026
            </span>
            {dot}
            <span style={{ fontSize: '0.67rem', color: 'var(--accent)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em' }}>
              {totalPlays.toLocaleString()} PLAYS
            </span>
            {dot}
            <span style={{ fontSize: '0.67rem', color: 'var(--muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em' }}>
              {Math.round(totalHours).toLocaleString()} HOURS
            </span>
            {dot}
            <span style={{ fontSize: '0.67rem', color: 'var(--muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em' }}>
              {totalDays} DAYS
            </span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 2.5rem 4rem' }}>

        {/* ── Insight chips ── */}
        {chips.length > 0 && (
          <div style={{
            display: 'flex', gap: 10, marginBottom: '3.5rem',
            overflowX: 'auto', paddingBottom: 4,
            scrollbarWidth: 'none', msOverflowStyle: 'none',
          } as React.CSSProperties}>
            {chips.map((chip, i) => (
              <div key={i} className="chip">
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.01em' }}>
                  {chip.label}
                </span>
                <span style={{ fontSize: '0.6rem', color: 'var(--muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.02em' }}>
                  {chip.sub}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '4rem' }}>
          <StatCard label="Total Plays" value={totalPlays.toLocaleString()} sub="April 2013 — May 2026" accent />
          <StatCard label="Hours Listened" value={Math.round(totalHours).toLocaleString()} sub={`${totalDays} days of audio`} />
          <StatCard label="Peak Year" value={String(peakYear?.year ?? '—')} sub={`${peakYear?.plays?.toLocaleString()} plays`} />
          <StatCard label="Top Artist" value={topArtists?.[0]?.artist_name ?? '—'} sub={`${topArtists?.[0]?.plays?.toLocaleString()} plays`} />
        </div>

        {/* ── 01 Listening Timeline ── */}
        <section style={{ marginBottom: '4rem' }}>
          <SectionHeader num="01" title="Listening Timeline" sub="plays & hours across 13 years" />
          <div style={{ ...card, padding: '1.75rem' }}>
            <YearlyChart data={yearly} />
          </div>
        </section>

        {/* ── 02 Top Artists  |  03 When You Listen + 04 Skip Rate ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: '4rem' }}>
          <section>
            <SectionHeader num="02" title="Top Artists" sub="all time · full history" />
            <div style={{ ...card, padding: '1.25rem 0.875rem' }}>
              <TopArtistsChart data={topArtists} />
            </div>
          </section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <section>
              <SectionHeader num="03" title="When You Listen" sub="day × hour · all time" />
              <div style={{ ...card, padding: '1.25rem' }}>
                <HourlyHeatmap data={hourly} />
              </div>
            </section>
            <section>
              <SectionHeader num="04" title="Skip Rate" sub="% of songs skipped by year" />
              <div style={{ ...card, padding: '1.25rem' }}>
                <SkipRateChart data={skipRate} />
              </div>
            </section>
          </div>
        </div>

        {/* ── 05 Most Played Tracks ── */}
        <section style={{ marginBottom: '4rem' }}>
          <SectionHeader num="05" title="Most Played Tracks" sub="all time · click any track to expand" />
          <TopTracksPanel tracks={topTracks} />
        </section>

        {/* ── 06 The Emotional Dossier ── */}
        <section>
          <SectionHeader num="06" title="The Emotional Dossier" sub="AI-generated interpretation of 487,240 plays · 2013–2026" />
          <AnalysisPanel />
        </section>

      </main>
    </div>
  )
}
