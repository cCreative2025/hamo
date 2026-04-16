-- Session RBAC
-- 객원 (guest/unauthenticated) : SELECT only
-- 팀원 (team editor/owner)     : INSERT session_songs + INSERT session_layers
-- 팀장 (session creator)       : full access + UPSERT song_forms + session_layers

-- ── sessions ──────────────────────────────────────────────────────────────────
-- Public SELECT already set in prior migration.
-- Ensure write policies are creator-only.
DROP POLICY IF EXISTS "Session creator can manage sessions" ON sessions;
DROP POLICY IF EXISTS "Sessions insert" ON sessions;
DROP POLICY IF EXISTS "Sessions update" ON sessions;
DROP POLICY IF EXISTS "Sessions delete" ON sessions;

CREATE POLICY "Sessions insert" ON sessions
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Sessions update" ON sessions
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Sessions delete" ON sessions
  FOR DELETE USING (created_by = auth.uid());

-- ── session_songs ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Session songs select" ON session_songs;
DROP POLICY IF EXISTS "Session songs insert" ON session_songs;
DROP POLICY IF EXISTS "Session songs update" ON session_songs;
DROP POLICY IF EXISTS "Session songs delete" ON session_songs;
DROP POLICY IF EXISTS "Participants can view session songs" ON session_songs;
DROP POLICY IF EXISTS "Session creator can manage songs" ON session_songs;
DROP POLICY IF EXISTS "Session creator can delete songs" ON session_songs;
DROP POLICY IF EXISTS "Session creator can update songs" ON session_songs;

-- 객원: read only
CREATE POLICY "session_songs_select" ON session_songs
  FOR SELECT USING (true);

-- 팀원 이상: insert (팀장 포함)
CREATE POLICY "session_songs_insert" ON session_songs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      -- 팀장 (session creator)
      session_id IN (
        SELECT id FROM sessions WHERE created_by = auth.uid()
      )
      OR
      -- 팀원 (team editor or owner of the session's team)
      session_id IN (
        SELECT s.id FROM sessions s
        INNER JOIN team_members tm ON tm.team_id = s.team_id
        WHERE tm.user_id = auth.uid()
          AND tm.role IN ('owner', 'editor')
          AND s.team_id IS NOT NULL
      )
    )
  );

-- 팀장만: update / delete
CREATE POLICY "session_songs_update" ON session_songs
  FOR UPDATE USING (
    session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
  );

CREATE POLICY "session_songs_delete" ON session_songs
  FOR DELETE USING (
    session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
  );

-- ── session_layers ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "View session_layers" ON session_layers;
DROP POLICY IF EXISTS "Insert own session_layers" ON session_layers;
DROP POLICY IF EXISTS "Update own session_layers" ON session_layers;
DROP POLICY IF EXISTS "Delete session_layers" ON session_layers;

-- 팀원 이상: read
CREATE POLICY "session_layers_select" ON session_layers
  FOR SELECT USING (
    created_by = auth.uid()
    OR session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
    OR session_id IN (
      SELECT s.id FROM sessions s
      INNER JOIN team_members tm ON tm.team_id = s.team_id
      WHERE tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'editor', 'viewer')
        AND s.team_id IS NOT NULL
    )
  );

-- 팀원 이상: insert own layers
CREATE POLICY "session_layers_insert" ON session_layers
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND (
      session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
      OR
      session_id IN (
        SELECT s.id FROM sessions s
        INNER JOIN team_members tm ON tm.team_id = s.team_id
        WHERE tm.user_id = auth.uid()
          AND tm.role IN ('owner', 'editor')
          AND s.team_id IS NOT NULL
      )
    )
  );

-- 팀장: update any layer / 팀원: update own layer
CREATE POLICY "session_layers_update" ON session_layers
  FOR UPDATE USING (
    created_by = auth.uid()
    OR session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
  );

-- 팀장: delete any / 팀원: delete own
CREATE POLICY "session_layers_delete" ON session_layers
  FOR DELETE USING (
    created_by = auth.uid()
    OR session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
  );

-- ── song_forms ────────────────────────────────────────────────────────────────
-- 팀장: 자신의 세션에 포함된 song_form도 upsert 가능
DROP POLICY IF EXISTS "Session creator can update session song_forms" ON song_forms;
DROP POLICY IF EXISTS "song_forms_update" ON song_forms;

CREATE POLICY "song_forms_update" ON song_forms
  FOR UPDATE USING (
    -- 원본 소유자
    created_by = auth.uid()
    OR
    -- 세션에 포함된 song_form은 해당 세션 팀장도 수정 가능
    id IN (
      SELECT ss.song_form_id
      FROM session_songs ss
      INNER JOIN sessions s ON s.id = ss.session_id
      WHERE s.created_by = auth.uid()
        AND ss.song_form_id IS NOT NULL
    )
  );
