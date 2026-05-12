-- Tracks catalog (one row per unique spotify track)
CREATE TABLE tracks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_track_uri   text UNIQUE NOT NULL,
  track_name          text,
  artist_name         text,
  album_name          text,
  -- audio features (backfilled later via Spotify API)
  valence             float,
  energy              float,
  danceability        float,
  acousticness        float,
  instrumentalness    float,
  tempo               float,
  duration_ms         int,
  explicit            bool,
  genres              text[],
  created_at          timestamptz DEFAULT now()
);

-- Raw play events
CREATE TABLE plays (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id            uuid REFERENCES tracks(id),
  spotify_track_uri   text,  -- kept denormalized for fast loading
  played_at           timestamptz NOT NULL,
  ms_played           int,
  platform            text,
  reason_start        text,
  reason_end          text,
  skipped             bool,
  shuffle             bool,
  offline             bool,
  conn_country        text,
  source_file         text   -- which json file this came from
);

-- Indexes
CREATE INDEX ON plays(played_at);
CREATE INDEX ON plays(track_id);
CREATE INDEX ON plays(spotify_track_uri);
CREATE INDEX ON plays(skipped);
CREATE INDEX ON plays(ms_played);

-- Useful view: real listens only (>30s, completed)
CREATE VIEW real_plays AS
  SELECT p.*, t.track_name, t.artist_name, t.album_name,
         t.valence, t.energy, t.danceability, t.acousticness,
         t.instrumentalness, t.tempo, t.genres
  FROM plays p
  LEFT JOIN tracks t ON t.id = p.track_id
  WHERE p.ms_played > 30000
    AND (p.skipped = false OR p.skipped IS NULL);
