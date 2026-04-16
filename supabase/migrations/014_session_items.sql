-- 014_session_items.sql
-- sessions + session_songs 테이블을 새 세션 플로우에 맞게 확장

-- ── sessions ────────────────────────────────────────────────

-- name 컬럼 추가 (title 대신 사용)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS name TEXT;

-- 기존 title 값을 name으로 복사
UPDATE sessions SET name = title WHERE name IS NULL;

-- title nullable로 변경
ALTER TABLE sessions
  ALTER COLUMN title DROP NOT NULL;

-- team_id nullable로 변경 (팀 없는 세션 허용)
ALTER TABLE sessions
  ALTER COLUMN team_id DROP NOT NULL;

-- tempo 컬럼 추가 (current_tempo와 별도)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS tempo INT DEFAULT 100;

-- ── session_songs ────────────────────────────────────────────

-- song_order → sequence_order 이름 변경
ALTER TABLE session_songs
  RENAME COLUMN song_order TO sequence_order;

-- sheet_id nullable로 변경 (ment 아이템은 sheet 없음)
ALTER TABLE session_songs
  ALTER COLUMN sheet_id DROP NOT NULL;

-- type 컬럼 추가 ('song' | 'ment')
ALTER TABLE session_songs
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'song'
    CHECK (type IN ('song', 'ment'));

-- song_form_id: 선택한 송폼
ALTER TABLE session_songs
  ADD COLUMN IF NOT EXISTS song_form_id UUID REFERENCES song_forms(id) ON DELETE SET NULL;

-- ment_text: 멘트 내용
ALTER TABLE session_songs
  ADD COLUMN IF NOT EXISTS ment_text TEXT;
