-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

CREATE OR REPLACE FUNCTION plays_per_year()
RETURNS TABLE(year int, plays bigint, unique_tracks bigint, hours_played numeric)
LANGUAGE sql STABLE
AS $$
  SELECT
    EXTRACT(YEAR FROM played_at)::int AS year,
    COUNT(*) AS plays,
    COUNT(DISTINCT spotify_track_uri) AS unique_tracks,
    ROUND((SUM(ms_played) / 3600000.0)::numeric, 1) AS hours_played
  FROM plays
  GROUP BY year
  ORDER BY year;
$$;

CREATE OR REPLACE FUNCTION top_artists(limit_n int DEFAULT 20)
RETURNS TABLE(artist_name text, plays bigint, hours numeric)
LANGUAGE sql STABLE
AS $$
  SELECT
    t.artist_name,
    COUNT(*) AS plays,
    ROUND((SUM(p.ms_played) / 3600000.0)::numeric, 1) AS hours
  FROM plays p
  JOIN tracks t ON t.id = p.track_id
  WHERE t.artist_name IS NOT NULL
  GROUP BY t.artist_name
  ORDER BY plays DESC
  LIMIT limit_n;
$$;

CREATE OR REPLACE FUNCTION top_tracks(limit_n int DEFAULT 10)
RETURNS TABLE(track_name text, artist_name text, plays bigint, hours numeric)
LANGUAGE sql STABLE
AS $$
  SELECT
    t.track_name,
    t.artist_name,
    COUNT(*) AS plays,
    ROUND((SUM(p.ms_played) / 3600000.0)::numeric, 1) AS hours
  FROM plays p
  JOIN tracks t ON t.id = p.track_id
  WHERE t.track_name IS NOT NULL
  GROUP BY t.track_name, t.artist_name
  ORDER BY plays DESC
  LIMIT limit_n;
$$;

CREATE OR REPLACE FUNCTION hourly_heatmap()
RETURNS TABLE(dow int, hour int, plays bigint)
LANGUAGE sql STABLE
AS $$
  SELECT
    EXTRACT(DOW FROM played_at)::int AS dow,
    EXTRACT(HOUR FROM played_at)::int AS hour,
    COUNT(*) AS plays
  FROM plays
  GROUP BY dow, hour
  ORDER BY dow, hour;
$$;

CREATE OR REPLACE FUNCTION skip_rate_by_year()
RETURNS TABLE(year int, skip_rate numeric, total_plays bigint)
LANGUAGE sql STABLE
AS $$
  SELECT
    EXTRACT(YEAR FROM played_at)::int AS year,
    ROUND(
      SUM(CASE WHEN skipped = true THEN 1 ELSE 0 END)::numeric / COUNT(*),
      4
    ) AS skip_rate,
    COUNT(*) AS total_plays
  FROM plays
  GROUP BY year
  ORDER BY year;
$$;

CREATE OR REPLACE FUNCTION platform_breakdown()
RETURNS TABLE(platform text, plays bigint, pct numeric)
LANGUAGE sql STABLE
AS $$
  SELECT
    COALESCE(platform, 'unknown') AS platform,
    COUNT(*) AS plays,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) AS pct
  FROM plays
  GROUP BY platform
  ORDER BY plays DESC;
$$;
