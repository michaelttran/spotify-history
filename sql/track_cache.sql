-- Run in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS track_cache (
  uri        text PRIMARY KEY,
  stats      jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);
