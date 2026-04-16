-- Add session_layers and song_forms to Supabase Realtime publication
-- Required for live layer sync and song form updates between team members

ALTER PUBLICATION supabase_realtime ADD TABLE session_layers;
ALTER PUBLICATION supabase_realtime ADD TABLE song_forms;
