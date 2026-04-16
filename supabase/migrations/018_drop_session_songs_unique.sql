-- Remove unique constraint on (session_id, sequence_order)
-- saveItems does full delete+insert replacement, constraint causes 409 conflicts

ALTER TABLE session_songs DROP CONSTRAINT IF EXISTS session_songs_session_id_song_order_key;
ALTER TABLE session_songs DROP CONSTRAINT IF EXISTS session_songs_session_id_sequence_order_key;
