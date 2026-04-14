-- 송폼에 flow 컬럼 추가 (섹션 재생 순서, 반복 허용)
-- sections: 정의 (V1 코드, V2 코드 등)
-- flow: 재생 순서 (섹션 id 배열, 예: [v1id, v2id, v1id, v2id, cid])
ALTER TABLE song_forms
  ADD COLUMN IF NOT EXISTS flow JSONB DEFAULT '[]'::jsonb;
