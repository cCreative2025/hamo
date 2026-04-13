-- 악보는 개인 관리 → 팀 체크 제거, 단순화

-- sheets 정책 재정의
DROP POLICY IF EXISTS "Users can view sheets from their teams" ON sheets;
DROP POLICY IF EXISTS "Owner can update sheet" ON sheets;
DROP POLICY IF EXISTS "Owner can delete sheet" ON sheets;

CREATE POLICY "Users can view own sheets"
  ON sheets FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Owner can update sheet"
  ON sheets FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owner can delete sheet"
  ON sheets FOR DELETE
  USING (owner_id = auth.uid());

-- sheet_versions 정책 재정의 (팀 체크 제거)
DROP POLICY IF EXISTS "Users can view sheet versions" ON sheet_versions;
DROP POLICY IF EXISTS "Users can upload sheet versions" ON sheet_versions;

CREATE POLICY "Users can view own sheet versions"
  ON sheet_versions FOR SELECT
  USING (
    sheet_id IN (SELECT id FROM sheets WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can upload sheet versions"
  ON sheet_versions FOR INSERT
  WITH CHECK (
    sheet_id IN (SELECT id FROM sheets WHERE owner_id = auth.uid())
  );
