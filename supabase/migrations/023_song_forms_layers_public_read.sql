-- song_forms: make SELECT public (was owner-only, broke session player for non-owners)
DROP POLICY IF EXISTS "Users can view song_forms" ON song_forms;
CREATE POLICY "Song forms are publicly readable"
  ON song_forms FOR SELECT
  USING (true);

-- session_layers: allow all users to view layers in any session
-- (write policies remain restrictive — own rows only)
DROP POLICY IF EXISTS "View session_layers" ON session_layers;
CREATE POLICY "View session_layers"
  ON session_layers FOR SELECT
  USING (true);
