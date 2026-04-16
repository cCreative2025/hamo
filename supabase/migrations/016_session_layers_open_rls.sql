-- Open session_layers to all authenticated session participants
-- (not just session creator)

DROP POLICY IF EXISTS "Session creator can view session_layers" ON session_layers;
DROP POLICY IF EXISTS "Session creator can insert session_layers" ON session_layers;
DROP POLICY IF EXISTS "Session creator can update session_layers" ON session_layers;
DROP POLICY IF EXISTS "Session creator can delete session_layers" ON session_layers;

-- Any authenticated user can view layers they authored OR for sessions they own
CREATE POLICY "View session_layers" ON session_layers
  FOR SELECT USING (
    created_by = auth.uid()
    OR session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
  );

-- Any authenticated user can insert their own layer versions
CREATE POLICY "Insert own session_layers" ON session_layers
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

-- Users can update only their own layers
CREATE POLICY "Update own session_layers" ON session_layers
  FOR UPDATE USING (created_by = auth.uid());

-- Session creator can delete any layer; others can delete only their own
CREATE POLICY "Delete session_layers" ON session_layers
  FOR DELETE USING (
    created_by = auth.uid()
    OR session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
  );
