-- Fix: session_layers INSERT policy excluded 'member' role
-- Team members with role='member' could not save their drawing layers.

DROP POLICY IF EXISTS "session_layers_insert" ON session_layers;

-- Allow any authenticated team member (any role) to insert their own layer
CREATE POLICY "session_layers_insert" ON session_layers
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND (
      -- Session creator
      session_id IN (
        SELECT id FROM sessions WHERE created_by = auth.uid()
      )
      OR
      -- Any team member (owner, editor, member, viewer)
      session_id IN (
        SELECT s.id FROM sessions s
        INNER JOIN team_members tm ON tm.team_id = s.team_id
        WHERE tm.user_id = auth.uid()
          AND s.team_id IS NOT NULL
      )
    )
  );

-- Also ensure song_forms has index on sheet_id for realtime filter performance
CREATE INDEX IF NOT EXISTS idx_song_forms_sheet_id ON song_forms(sheet_id);
