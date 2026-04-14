-- 송폼별 드로잉 레이어 데이터 저장
ALTER TABLE song_forms
  ADD COLUMN IF NOT EXISTS drawing_data JSONB DEFAULT '[]'::jsonb;
