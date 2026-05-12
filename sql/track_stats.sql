-- Run in Supabase SQL Editor

-- Update top_tracks to include spotify_track_uri
DROP FUNCTION IF EXISTS top_tracks(integer);
CREATE OR REPLACE FUNCTION top_tracks(limit_n int DEFAULT 10)
RETURNS TABLE(track_name text, artist_name text, plays bigint, hours numeric, spotify_track_uri text)
LANGUAGE sql STABLE AS $$
  SELECT
    t.track_name,
    t.artist_name,
    COUNT(*) AS plays,
    ROUND((SUM(p.ms_played) / 3600000.0)::numeric, 1) AS hours,
    t.spotify_track_uri
  FROM plays p
  JOIN tracks t ON t.id = p.track_id
  WHERE t.track_name IS NOT NULL
  GROUP BY t.track_name, t.artist_name, t.spotify_track_uri
  ORDER BY plays DESC
  LIMIT limit_n;
$$;

-- Detailed stats for a single track
CREATE OR REPLACE FUNCTION track_stats(p_uri text)
RETURNS json LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT * FROM plays WHERE spotify_track_uri = p_uri
  ),
  by_year AS (
    SELECT EXTRACT(YEAR FROM played_at)::int AS year, COUNT(*) AS plays
    FROM base GROUP BY year ORDER BY year
  ),
  peak_month AS (
    SELECT
      TO_CHAR(DATE_TRUNC('month', played_at), 'Mon YYYY') AS month,
      COUNT(*) AS plays
    FROM base
    GROUP BY DATE_TRUNC('month', played_at)
    ORDER BY plays DESC
    LIMIT 1
  ),
  peak_hour AS (
    SELECT EXTRACT(HOUR FROM played_at)::int AS hour
    FROM base
    GROUP BY EXTRACT(HOUR FROM played_at)
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )
  SELECT json_build_object(
    'total_plays',       (SELECT COUNT(*) FROM base),
    'total_ms',          (SELECT COALESCE(SUM(ms_played), 0) FROM base),
    'first_play',        (SELECT MIN(played_at) FROM base),
    'last_play',         (SELECT MAX(played_at) FROM base),
    'skip_rate',         (SELECT ROUND(AVG(CASE WHEN skipped THEN 1.0 ELSE 0.0 END)::numeric, 4) FROM base),
    'peak_hour',         (SELECT hour FROM peak_hour),
    'peak_month',        (SELECT month FROM peak_month),
    'peak_month_plays',  (SELECT plays FROM peak_month),
    'by_year',           (SELECT COALESCE(json_agg(json_build_object('year', year, 'plays', plays)), '[]'::json) FROM by_year)
  )
$$;
