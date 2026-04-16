-- 세션에서 생성하는 송폼은 sheet 없이도 가능하도록
-- 1. sheet_id nullable
ALTER TABLE song_forms
  ALTER COLUMN sheet_id DROP NOT NULL;

-- 2. INSERT 정책 교체: sheet 소유자이거나, sheet 없이 본인이 만드는 경우 모두 허용
DROP POLICY IF EXISTS "Users can create song forms" ON song_forms;

CREATE POLICY "Users can create song forms"
  ON song_forms FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND (
      sheet_id IS NULL OR
      sheet_id IN (SELECT id FROM sheets WHERE owner_id = auth.uid())
    )
  );

-- 3. SELECT 정책 교체: 본인이 만든 것 + 팀원 공유 read는 023에서 이미 처리
DROP POLICY IF EXISTS "Users can view own song forms" ON song_forms;

CREATE POLICY "Users can view own song forms"
  ON song_forms FOR SELECT
  USING (
    created_by = auth.uid() OR
    sheet_id IN (SELECT id FROM sheets WHERE owner_id = auth.uid())
  );
