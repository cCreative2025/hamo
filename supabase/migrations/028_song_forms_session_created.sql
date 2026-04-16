-- 세션에서 생성하는 송폼: sheet에 종속되되, sheet 소유자가 아니어도 생성 가능
-- 1. sheet_id nullable (sheet 없는 경우 대비)
ALTER TABLE song_forms
  ALTER COLUMN sheet_id DROP NOT NULL;

-- 2. INSERT 정책: 본인이 만드는 것이면 허용 (sheet 소유 여부 불문)
DROP POLICY IF EXISTS "Users can create song forms" ON song_forms;

CREATE POLICY "Users can create song forms"
  ON song_forms FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- 3. SELECT 정책: 본인이 만든 것 + 본인 sheet에 연결된 것
DROP POLICY IF EXISTS "Users can view own song forms" ON song_forms;

CREATE POLICY "Users can view own song forms"
  ON song_forms FOR SELECT
  USING (
    created_by = auth.uid() OR
    sheet_id IN (SELECT id FROM sheets WHERE owner_id = auth.uid())
  );
