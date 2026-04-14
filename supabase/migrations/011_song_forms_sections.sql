-- song_forms에 sections JSONB 컬럼 추가
-- sections 구조: [{id: string, type: string, chords: string[]}]
ALTER TABLE song_forms ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]'::jsonb;
