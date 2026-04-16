-- Session-specific drawing layer snapshots
-- Each row = one saved version of a drawing layer for a (session, song_form) pair
-- Allows per-session layer history without touching the original song_form.drawing_data

CREATE TABLE IF NOT EXISTS session_layers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  song_form_id uuid REFERENCES song_forms(id) ON DELETE CASCADE NOT NULL,
  drawing_data jsonb NOT NULL DEFAULT '[]',
  version_number integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE session_layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session creator can view session_layers" ON session_layers
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
  );

CREATE POLICY "Session creator can insert session_layers" ON session_layers
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
  );

CREATE POLICY "Session creator can update session_layers" ON session_layers
  FOR UPDATE USING (
    session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
  );

CREATE POLICY "Session creator can delete session_layers" ON session_layers
  FOR DELETE USING (
    session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
  );
