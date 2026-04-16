-- 004_session_items.sql
-- session_songs 테이블을 song/ment 두 타입을 지원하도록 확장

-- sheet_version_id nullable로 변경 (ment 아이템은 sheet가 없음)
ALTER TABLE session_songs
  ALTER COLUMN sheet_version_id DROP NOT NULL;

-- type 컬럼 추가 ('song' | 'ment')
ALTER TABLE session_songs
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'song'
    CHECK (type IN ('song', 'ment'));

-- sheet_id: 버전이 아닌 악보 직접 참조
ALTER TABLE session_songs
  ADD COLUMN IF NOT EXISTS sheet_id uuid REFERENCES sheets(id) ON DELETE SET NULL;

-- song_form_id: 선택한 송폼
ALTER TABLE session_songs
  ADD COLUMN IF NOT EXISTS song_form_id uuid REFERENCES song_forms(id) ON DELETE SET NULL;

-- ment_text: 멘트 내용
ALTER TABLE session_songs
  ADD COLUMN IF NOT EXISTS ment_text text;

-- sessions 테이블 team_id nullable 보장 (팀 선택 선택사항)
ALTER TABLE sessions
  ALTER COLUMN team_id DROP NOT NULL;
