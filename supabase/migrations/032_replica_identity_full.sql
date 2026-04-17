-- Required for Supabase Realtime to broadcast UPDATE events with row-level filters.
-- Without FULL, the filter can't be applied to UPDATE/DELETE events on non-PK columns.
ALTER TABLE session_layers REPLICA IDENTITY FULL;
ALTER TABLE song_forms REPLICA IDENTITY FULL;
