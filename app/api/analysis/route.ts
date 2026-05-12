import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// In-memory rate limiter — resets on cold start, fine for personal use
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20        // requests
const RATE_WINDOW = 3_600_000 // 1 hour in ms

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return false
  }
  if (entry.count >= RATE_LIMIT) return true
  entry.count++
  return false
}

const SECTIONS = {
  summary: {
    title: 'High-Level Summary',
    prompt: (data: string) => `You are doing a deep music identity analysis of someone's FULL Spotify listening history from 2013-2026 (487,000+ play events, 16,000+ hours).

Here is aggregated data from their complete history:
${data}

Write a HIGH-LEVEL PSYCHOLOGICAL AND CULTURAL SUMMARY (600-900 words). Cover:
- What kind of person this music profile suggests overall
- Recurring emotional needs across 13 years
- Core personality traits that show up repeatedly
- The overarching emotional arc of the decade
- Major contradictions in their taste
- What the data reveals that they might not consciously know about themselves

Be specific. Reference actual artists and years. Avoid generic observations. Write in flowing prose. Be psychologically insightful and direct.`,
  },
  years: {
    title: 'Era Analysis',
    prompt: (data: string) => `You are doing a deep music identity analysis of someone's FULL Spotify listening history from 2013-2026.

Here is their data by year:
${data}

Write a YEAR-BY-YEAR ERA BREAKDOWN. For each year from 2013-2026, write 120-150 words covering:
- Era name and vibe
- Emotional state and mindset inferred from play counts, hours, and listening patterns
- Whether the year feels: social/isolated, romantic, ambitious, nostalgic, escapist, stable/turbulent
- What the volume of listening (high vs low years) itself says emotionally
- Implied lifestyle

Note: 2013-2014 had low plays (still early Spotify days). 2015 exploded. 2019 was the peak (67k plays, 2,235 hours). 2021 dropped hard. Use these patterns meaningfully.`,
  },
  patterns: {
    title: 'Psychological Patterns',
    prompt: (data: string) => `You are doing a deep music identity analysis of someone's FULL Spotify listening history from 2013-2026 (487,000 plays).

Here is their data:
${data}

Analyze MAJOR PSYCHOLOGICAL AND EMOTIONAL PATTERNS (700-900 words). Cover:
- Recurring emotional themes across 13 years
- What the skip rate data reveals (skipping = rejection, low skip = absorption)
- What the platform data reveals (iOS vs other = mobile listener = music as escape/companion)
- The relationship between high-volume years and emotional state
- What listening at specific hours of day suggests
- The tension between their taste for melancholic/dark music and high-energy tracks
- Emotional loops they seem to revisit
- Hidden trends in the raw numbers that aren't obvious

Be analytical and specific.`,
  },
  artists: {
    title: 'Artist Analysis',
    prompt: (data: string) => `You are doing a deep music identity analysis of someone's FULL Spotify listening history from 2013-2026.

Here is their top artists data from the complete 487k play history:
${data}

Write an ARTIST ANALYSIS (700-900 words). For the top artists, analyze:
- What each major artist represents emotionally/psychologically
- Artist loyalty patterns — who they keep returning to vs. who they binge and leave
- Which artists feel like core identity vs. phase-specific
- What the combination of artists reveals about contradictions in their personality
- Which artists likely correspond to specific life events or emotional periods
- The significance of any artist appearing across many years

Be specific and psychologically insightful.`,
  },
  archetypes: {
    title: 'Emotional Archetypes',
    prompt: (data: string) => `You are doing a deep music identity analysis of someone's FULL Spotify listening history from 2013-2026 (487,000 plays, 16,000+ hours).

Here is their complete listening data:
${data}

Identify 5-7 EMOTIONAL ARCHETYPES present in this listening profile. For each archetype:
- Give it a specific, evocative name (not generic)
- Describe which years it dominated
- Identify which artists/listening patterns embody it
- Explain what psychological need it served
- Describe how it evolved or was replaced

Think about: The sheer volume (6 hrs/day in 2019) suggests music as psychological infrastructure, not casual listening. The dip years (2021, 2024) are as revealing as the peak years.

Be creative and specific. 600-800 words.`,
  },
  psych: {
    title: 'Final Psychological Read',
    prompt: (data: string) => `You are doing a deep music identity analysis of someone's FULL Spotify listening history from 2013-2026.

Complete data:
${data}

Write a FINAL PSYCHOLOGICAL READ (500-700 words). Be direct, honest, unfiltered. Cover:
- What 13 years and 487,000 plays says about this person's relationship with music
- Their relationship with emotion (do they process through music or feel directly?)
- What the volume of listening (674 days of audio) says about their inner life
- Their relationship with identity and change
- What their listening in the dip years (2021: 982 hrs, 2024: 942 hrs) reveals
- What their 2025 trajectory suggests about where they are now
- One honest observation they might not want to hear

Do NOT be flattering. Be like a perceptive therapist who's read the data. Be real.`,
  },
  insights: {
    title: 'Most Interesting Insights',
    prompt: (data: string) => `You are doing a deep music identity analysis of someone's FULL Spotify listening history from 2013-2026 (487,240 plays, 16,183 hours).

Data:
${data}

Give the MOST INTERESTING INSIGHTS. Answer specifically:
1. Most surprising pattern in the full 13-year dataset
2. What the skip rate data reveals psychologically
3. Most significant year and why (not necessarily the highest volume)
4. The most revealing single data point in the entire dataset
5. What the 2013 data (their earliest Spotify days, only 488 unique tracks) says about who they were then
6. The biggest personality contradiction the data reveals
7. What would most surprise them about their own data
8. The pattern that only becomes visible across the full 13 years (not visible in any single year)
9. What their peak year (2019, 2,235 hours) says about that period of their life
10. Prediction: what their listening will look like in 2027 based on current trajectory

Be bold, specific, and willing to make strong reads. 700-900 words.`,
  },
}

export async function POST(req: Request) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return new Response('Rate limit exceeded — try again in an hour', { status: 429 })
  }

  const { section } = await req.json()
  const sectionConfig = SECTIONS[section as keyof typeof SECTIONS]
  if (!sectionConfig) {
    return new Response('Invalid section', { status: 400 })
  }

  // Return cached result if it exists
  const { data: cached } = await supabase
    .from('analysis_cache')
    .select('content')
    .eq('section', section)
    .single()

  if (cached?.content) {
    const encoder = new TextEncoder()
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(cached.content))
          controller.close()
        },
      }),
      { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Cache': 'HIT' } }
    )
  }

  // Cache miss — fetch live data and call Claude
  const [yearly, topArtists, topTracks, platforms, hourly, skipRate] = await Promise.all([
    supabase.rpc('plays_per_year'),
    supabase.rpc('top_artists', { limit_n: 30 }),
    supabase.rpc('top_tracks', { limit_n: 30 }),
    supabase.rpc('platform_breakdown'),
    supabase.rpc('hourly_heatmap'),
    supabase.rpc('skip_rate_by_year'),
  ])

  const contextData = JSON.stringify({
    yearly: yearly.data,
    topArtists: topArtists.data,
    topTracks: topTracks.data,
    platforms: platforms.data,
    hourly: hourly.data,
    skipRate: skipRate.data,
  }, null, 2)

  const claudeStream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: sectionConfig.prompt(contextData) }],
  })

  // Stream to client while accumulating for cache
  const encoder = new TextEncoder()
  let accumulated = ''

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of claudeStream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          accumulated += chunk.delta.text
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()

      // Persist to cache after stream completes
      if (accumulated) {
        await supabase
          .from('analysis_cache')
          .upsert({ section, content: accumulated })
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Cache': 'MISS' },
  })
}
