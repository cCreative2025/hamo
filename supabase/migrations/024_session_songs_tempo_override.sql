-- Add tempo_override to session_songs
-- Leaders can set a per-session tempo that overrides song_form and sheet defaults.
ALTER TABLE session_songs ADD COLUMN IF NOT EXISTS tempo_override INTEGER;
