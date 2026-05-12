# spotify-history

A personal data visualization app for 13 years of Spotify listening history. Built as an emotional archive, not an analytics dashboard.

**487,240 plays · 16,183 hours · 674 days of audio · April 2013 – May 2026**

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Database | Supabase (hosted Postgres) |
| Charts | Recharts |
| AI analysis | Anthropic SDK (claude-sonnet-4-6, streaming) |
| Styling | Tailwind CSS v4 |
| Deployment | Vercel |
| Data loader | Python + supabase-py |

---

## Features

- **Listening Timeline** — plays and hours per year, 2013–2026
- **Top Artists** — horizontal bar chart, all-time
- **When You Listen** — day × hour heatmap across all plays
- **Skip Rate** — skip percentage trend by year
- **Most Played Tracks** — expandable rows with per-track deep stats (first/last listen, plays by year, peak month, peak hour, skip rate)
- **Identity Analysis** — 7-section AI analysis panel powered by Claude, streamed and cached per section
- **Insight chips** — computed personality badges derived from live data

---

## Project Structure

```
app/
  layout.tsx              # root layout
  page.tsx                # server component — fetches all data, renders dashboard
  globals.css             # design system, CSS vars, fonts, animations
  api/
    stats/route.ts        # GET — returns all RPC data as JSON
    analysis/route.ts     # POST { section } — streams Claude analysis, caches to Supabase
    track/route.ts        # POST { uri } — returns per-track deep stats

components/
  StatCard.tsx            # glassmorphism stat card
  YearlyChart.tsx         # ComposedChart: bars (plays) + line (hours)
  TopArtistsChart.tsx     # horizontal BarChart, top 15 artists
  HourlyHeatmap.tsx       # custom day × hour grid
  SkipRateChart.tsx       # LineChart, skip % by year
  TopTracksPanel.tsx      # expandable track list with per-track detail drawer
  AnalysisPanel.tsx       # pill nav + streaming AI analysis

sql/
  schema.sql              # tables: tracks, plays + indexes + real_plays view
  functions.sql           # RPC functions for dashboard queries
  cache.sql               # analysis_cache table
  track_stats.sql         # track_stats() and updated top_tracks() functions

spotify_load.py           # Python script to load Spotify JSON export into Supabase
```

---

## Database Schema

```sql
tracks (
  id uuid PK,
  spotify_track_uri text UNIQUE,
  track_name text, artist_name text, album_name text,
  valence float, energy float, danceability float,
  acousticness float, instrumentalness float,
  tempo float, duration_ms int, explicit bool, genres text[]
)

plays (
  id uuid PK,
  track_id uuid FK -> tracks,
  spotify_track_uri text,
  played_at timestamptz,
  ms_played int,
  platform text,
  reason_start text, reason_end text,
  skipped bool, shuffle bool, offline bool,
  conn_country text, source_file text
)

analysis_cache (
  section text PK,
  content text,
  created_at timestamptz
)
```

### Supabase RPC Functions

| Function | Returns |
|---|---|
| `plays_per_year()` | year, plays, unique_tracks, hours_played |
| `top_artists(limit_n)` | artist_name, plays, hours |
| `top_tracks(limit_n)` | track_name, artist_name, plays, hours, spotify_track_uri |
| `hourly_heatmap()` | dow, hour, plays |
| `skip_rate_by_year()` | year, skip_rate, total_plays |
| `platform_breakdown()` | platform, plays, pct |
| `track_stats(uri)` | JSON: total_plays, total_ms, first_play, last_play, skip_rate, peak_hour, peak_month, by_year |

---

## Setup

### 1. Environment variables

Copy `.env.local.template` to `.env` and fill in your values:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### 2. Database

Run the SQL files in order in the Supabase SQL Editor:

```
sql/schema.sql        # create tables and indexes
sql/functions.sql     # create RPC functions
sql/cache.sql         # create analysis cache table
sql/track_stats.sql   # create track_stats() function
```

### 3. Load data

```bash
python -m venv venv
source venv/bin/activate
pip install supabase python-dotenv tqdm

python spotify_load.py --dir "Spotify Extended Streaming History"
```

### 4. Run the app

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in Vercel
3. Add environment variables in Vercel dashboard: `SUPABASE_URL`, `SUPABASE_KEY`, `ANTHROPIC_API_KEY`
4. Deploy

---

## AI Analysis

The analysis panel has 7 sections, each POSTing to `/api/analysis`:

1. High-Level Summary
2. Era Analysis (year-by-year)
3. Psychological Patterns
4. Artist Analysis
5. Emotional Archetypes
6. Final Psychological Read
7. Most Interesting Insights

Results are streamed from Claude and permanently cached in the `analysis_cache` Supabase table. To regenerate a section:

```sql
DELETE FROM analysis_cache WHERE section = 'summary';
```

---

## Security

- Service role key is server-side only (no `NEXT_PUBLIC_` prefix)
- Rate limiting on `/api/analysis` (20 req/hr) and `/api/track` (60 req/hr)
- All DB calls use parameterized Supabase RPC — no SQL injection surface
- Error messages are sanitized before returning to the client
