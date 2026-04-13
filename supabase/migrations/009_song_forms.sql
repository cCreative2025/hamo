-- 송폼 (코드 진행) 테이블
CREATE TABLE IF NOT EXISTS song_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '기본',
  key TEXT,
  chord_progression TEXT,
  memo TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_song_forms_sheet_id ON song_forms(sheet_id);

-- RLS
ALTER TABLE song_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own song forms"
  ON song_forms FOR SELECT
  USING (sheet_id IN (SELECT id FROM sheets WHERE owner_id = auth.uid()));

CREATE POLICY "Users can create song forms"
  ON song_forms FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    sheet_id IN (SELECT id FROM sheets WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can update own song forms"
  ON song_forms FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own song forms"
  ON song_forms FOR DELETE
  USING (created_by = auth.uid());
