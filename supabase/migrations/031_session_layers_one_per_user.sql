-- Enforce one layer per user per session song (drop version history model)
-- Keep only the latest row per (session_song_id, created_by), delete duplicates

DELETE FROM session_layers
WHERE session_song_id IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT ON (session_song_id, created_by) id
    FROM session_layers
    WHERE session_song_id IS NOT NULL
    ORDER BY session_song_id, created_by, created_at DESC
  );

-- Unique index: one layer per user per session song
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_layers_user_song_unique
  ON session_layers (session_song_id, created_by)
  WHERE session_song_id IS NOT NULL;
