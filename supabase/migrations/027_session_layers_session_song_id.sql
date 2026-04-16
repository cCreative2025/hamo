-- 내 레이어는 세션에 종속 — session_song_id 추가, song_form_id nullable
ALTER TABLE session_layers
  ADD COLUMN IF NOT EXISTS session_song_id UUID REFERENCES session_songs(id) ON DELETE CASCADE;

ALTER TABLE session_layers
  ALTER COLUMN song_form_id DROP NOT NULL;
