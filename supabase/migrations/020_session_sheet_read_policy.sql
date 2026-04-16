-- Allow reading sheets that are part of any session's setlist
-- (session_songs.sheet_id references sheets.id)
CREATE POLICY "Session setlist sheets are viewable"
  ON sheets FOR SELECT
  USING (
    id IN (
      SELECT sheet_id FROM session_songs WHERE sheet_id IS NOT NULL
    )
  );

-- Allow reading sheet_versions for sheets in any session's setlist
CREATE POLICY "Session setlist sheet versions are viewable"
  ON sheet_versions FOR SELECT
  USING (
    sheet_id IN (
      SELECT sheet_id FROM session_songs WHERE sheet_id IS NOT NULL
    )
  );
