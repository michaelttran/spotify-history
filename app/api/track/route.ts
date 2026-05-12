import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 60
const RATE_WINDOW = 3_600_000

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

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const body = await req.json()
  const uri = body?.uri
  if (typeof uri !== 'string' || uri.length > 200) {
    return NextResponse.json({ error: 'Invalid uri' }, { status: 400 })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!)

  // Return cached result if it exists
  const { data: cached } = await supabase
    .from('track_cache')
    .select('stats')
    .eq('uri', uri)
    .single()

  if (cached?.stats) {
    return NextResponse.json(cached.stats, { headers: { 'X-Cache': 'HIT' } })
  }

  // Cache miss — fetch from Supabase
  const { data, error } = await supabase.rpc('track_stats', { p_uri: uri })
  if (error) {
    console.error('[track_stats error]', error.code)
    return NextResponse.json({ error: 'Failed to load track stats' }, { status: 500 })
  }

  // Persist to cache
  await supabase.from('track_cache').upsert({ uri, stats: data })

  return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } })
}
