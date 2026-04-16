-- Ensure session_songs RLS policies exist
-- (these were previously added via SQL editor, now codified as migration)

ALTER TABLE session_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Session songs select" ON session_songs;
DROP POLICY IF EXISTS "Session songs insert" ON session_songs;
DROP POLICY IF EXISTS "Session songs update" ON session_songs;
DROP POLICY IF EXISTS "Session songs delete" ON session_songs;
DROP POLICY IF EXISTS "Session creator can delete songs" ON session_songs;
DROP POLICY IF EXISTS "Session creator can insert songs" ON session_songs;

CREATE POLICY "Session songs select" ON session_songs
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
  );

CREATE POLICY "Session songs insert" ON session_songs
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
  );

CREATE POLICY "Session songs update" ON session_songs
  FOR UPDATE USING (
    session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
  );

CREATE POLICY "Session songs delete" ON session_songs
  FOR DELETE USING (
    session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
  );
