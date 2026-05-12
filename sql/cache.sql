-- Run once in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS analysis_cache (
  section     text PRIMARY KEY,
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now()
);
