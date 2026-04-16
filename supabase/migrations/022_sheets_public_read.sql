-- sheets + sheet_versions: make SELECT fully public
-- File content is still protected by storage RLS (storage.objects policies).
-- Metadata alone is not sensitive.

DROP POLICY IF EXISTS "Session setlist sheets are viewable" ON sheets;
DROP POLICY IF EXISTS "Users can view sheets from their teams" ON sheets;

CREATE POLICY "Sheets are publicly readable"
  ON sheets FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Session setlist sheet versions are viewable" ON sheet_versions;
DROP POLICY IF EXISTS "Users can view sheet versions" ON sheet_versions;
DROP POLICY IF EXISTS "Users can view own sheet versions" ON sheet_versions;

CREATE POLICY "Sheet versions are publicly readable"
  ON sheet_versions FOR SELECT
  USING (true);
