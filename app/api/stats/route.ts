import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  )
  const [yearlyRes, topArtistsRes, topTracksRes, platformRes, hourlyRes, skipRes] =
    await Promise.all([
      supabase.rpc('plays_per_year'),
      supabase.rpc('top_artists', { limit_n: 20 }),
      supabase.rpc('top_tracks', { limit_n: 20 }),
      supabase.rpc('platform_breakdown'),
      supabase.rpc('hourly_heatmap'),
      supabase.rpc('skip_rate_by_year'),
    ])

  return NextResponse.json({
    yearly: yearlyRes.data,
    topArtists: topArtistsRes.data,
    topTracks: topTracksRes.data,
    platforms: platformRes.data,
    hourly: hourlyRes.data,
    skipRate: skipRes.data,
  })
}
