"""
spotify_load.py
---------------
Loads all Streaming_History_Audio_*.json files into Supabase.

Setup:
    pip install supabase python-dotenv tqdm

Usage:
    python spotify_load.py --dir /path/to/your/json/files
"""

import os
import json
import glob
import argparse
import time
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
from tqdm import tqdm

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")  # use service_role key

BATCH_SIZE = 500  # rows per insert — Supabase handles up to ~1000 safely


def get_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError(
            "Missing SUPABASE_URL or SUPABASE_KEY. "
            "Create a .env file with both values."
        )
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def load_json_file(path: str) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def parse_play(raw: dict, source_file: str) -> dict | None:
    """Convert a raw Spotify play event to our DB schema."""
    # skip podcast episodes and audiobooks
    if raw.get("episode_name") or raw.get("audiobook_title"):
        return None

    uri = raw.get("spotify_track_uri")
    if not uri:
        return None

    ts = raw.get("ts")
    if not ts:
        return None

    return {
        "spotify_track_uri": uri,
        "played_at": ts,
        "ms_played": raw.get("ms_played"),
        "platform": raw.get("platform"),
        "reason_start": raw.get("reason_start"),
        "reason_end": raw.get("reason_end"),
        "skipped": raw.get("skipped"),
        "shuffle": raw.get("shuffle"),
        "offline": raw.get("offline"),
        "conn_country": raw.get("conn_country"),
        "source_file": source_file,
        # track metadata stored on the tracks table, but we collect
        # it here to upsert into tracks later
        "_track_name": raw.get("master_metadata_track_name"),
        "_artist_name": raw.get("master_metadata_album_artist_name"),
        "_album_name": raw.get("master_metadata_album_album_name"),
    }


def upsert_tracks(supabase: Client, plays: list[dict]) -> dict[str, str]:
    """
    Upsert unique tracks and return a map of
    spotify_track_uri -> tracks.id
    """
    seen = {}
    for p in plays:
        uri = p["spotify_track_uri"]
        if uri not in seen:
            seen[uri] = {
                "spotify_track_uri": uri,
                "track_name": p.get("_track_name"),
                "artist_name": p.get("_artist_name"),
                "album_name": p.get("_album_name"),
            }

    track_rows = list(seen.values())
    uri_to_id = {}

    # upsert in batches
    for i in range(0, len(track_rows), BATCH_SIZE):
        batch = track_rows[i : i + BATCH_SIZE]
        res = (
            supabase.table("tracks")
            .upsert(batch, on_conflict="spotify_track_uri")
            .execute()
        )
        for row in res.data:
            uri_to_id[row["spotify_track_uri"]] = row["id"]

    return uri_to_id


def insert_plays(supabase: Client, plays: list[dict], uri_to_id: dict[str, str]):
    """Insert play events with track_id resolved."""
    rows = []
    for p in plays:
        uri = p["spotify_track_uri"]
        rows.append({
            "track_id": uri_to_id.get(uri),
            "spotify_track_uri": uri,
            "played_at": p["played_at"],
            "ms_played": p["ms_played"],
            "platform": p["platform"],
            "reason_start": p["reason_start"],
            "reason_end": p["reason_end"],
            "skipped": p["skipped"],
            "shuffle": p["shuffle"],
            "offline": p["offline"],
            "conn_country": p["conn_country"],
            "source_file": p["source_file"],
        })

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        supabase.table("plays").insert(batch).execute()


def process_file(supabase: Client, path: str) -> tuple[int, int]:
    """Process a single JSON file. Returns (parsed, skipped)."""
    filename = os.path.basename(path)
    raw_events = load_json_file(path)

    plays = []
    skipped = 0
    for raw in raw_events:
        parsed = parse_play(raw, filename)
        if parsed:
            plays.append(parsed)
        else:
            skipped += 1

    if not plays:
        return 0, skipped

    # upsert tracks first, get uri->id map
    uri_to_id = upsert_tracks(supabase, plays)

    # insert plays
    insert_plays(supabase, plays, uri_to_id)

    return len(plays), skipped


def main():
    parser = argparse.ArgumentParser(description="Load Spotify history into Supabase")
    parser.add_argument(
        "--dir",
        required=True,
        help="Directory containing Streaming_History_Audio_*.json files",
    )
    parser.add_argument(
        "--pattern",
        default="Streaming_History_Audio_*.json",
        help="Glob pattern for files (default: Streaming_History_Audio_*.json)",
    )
    args = parser.parse_args()

    supabase = get_client()

    files = sorted(glob.glob(os.path.join(args.dir, args.pattern)))
    if not files:
        print(f"No files found matching {args.pattern} in {args.dir}")
        return

    print(f"Found {len(files)} files to process\n")

    total_inserted = 0
    total_skipped = 0
    errors = []

    for path in tqdm(files, desc="Files", unit="file"):
        try:
            inserted, skipped = process_file(supabase, path)
            total_inserted += inserted
            total_skipped += skipped
            tqdm.write(f"  ✓ {os.path.basename(path)}: {inserted:,} plays, {skipped} skipped")
        except Exception as e:
            tqdm.write(f"  ✗ {os.path.basename(path)}: ERROR — {e}")
            errors.append((path, str(e)))
            time.sleep(1)  # brief pause on error before continuing

    print(f"\n{'='*50}")
    print(f"Done!")
    print(f"  Plays inserted : {total_inserted:,}")
    print(f"  Events skipped : {total_skipped:,}  (podcasts, audiobooks, nulls)")
    if errors:
        print(f"  Files with errors: {len(errors)}")
        for path, err in errors:
            print(f"    - {os.path.basename(path)}: {err}")


if __name__ == "__main__":
    main()
