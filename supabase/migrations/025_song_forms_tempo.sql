-- Add tempo column to song_forms
ALTER TABLE song_forms ADD COLUMN IF NOT EXISTS tempo INTEGER;
