-- RLS (Row Level Security) 정책 설정

-- 1. Users RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- 2. Teams RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their teams"
  ON teams FOR SELECT
  USING (
    owner_id = auth.uid() OR
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Only team owner can update team"
  ON teams FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Only team owner can delete team"
  ON teams FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- 3. Team Members RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view team members"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
    ) OR
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Team owner can manage members"
  ON team_members FOR DELETE
  USING (
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

-- 4. Team Invites RLS
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team owner can create invites"
  ON team_invites FOR INSERT
  WITH CHECK (
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

CREATE POLICY "Invited users can view invites"
  ON team_invites FOR SELECT
  USING (email = auth.jwt()->>'email' OR team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()));

-- 5. Sheets RLS
ALTER TABLE sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sheets from their teams"
  ON sheets FOR SELECT
  USING (
    owner_id = auth.uid() OR
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()) OR
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create sheets"
  ON sheets FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner can update sheet"
  ON sheets FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

CREATE POLICY "Owner can delete sheet"
  ON sheets FOR DELETE
  USING (
    owner_id = auth.uid() OR
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

-- 6. Sheet Versions RLS
ALTER TABLE sheet_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sheet versions"
  ON sheet_versions FOR SELECT
  USING (
    sheet_id IN (SELECT id FROM sheets WHERE owner_id = auth.uid()) OR
    sheet_id IN (
      SELECT id FROM sheets
      WHERE team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
    ) OR
    sheet_id IN (
      SELECT id FROM sheets
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can upload sheet versions"
  ON sheet_versions FOR INSERT
  WITH CHECK (
    sheet_id IN (SELECT id FROM sheets WHERE owner_id = auth.uid()) OR
    sheet_id IN (
      SELECT id FROM sheets
      WHERE team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
    )
  );

-- 7. Sessions RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view sessions"
  ON sessions FOR SELECT
  USING (
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()) OR
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()) OR
    id IN (SELECT session_id FROM session_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create sessions"
  ON sessions FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team leaders can update sessions"
  ON sessions FOR UPDATE
  USING (
    created_by = auth.uid() OR
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

-- 8. Session Songs RLS
ALTER TABLE session_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view session songs"
  ON session_songs FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM sessions
      WHERE team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
      OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
      OR id IN (SELECT session_id FROM session_participants WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Session creator can manage songs"
  ON session_songs FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions WHERE created_by = auth.uid()
    )
  );

-- 9. Session Participants RLS
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view session participants"
  ON session_participants FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM sessions
      WHERE team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
      OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
      OR id IN (SELECT session_id FROM session_participants WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can join sessions"
  ON session_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 10. Sheet Locks RLS
ALTER TABLE sheet_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session participants can view locks"
  ON sheet_locks FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM sessions
      WHERE team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
      OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
      OR id IN (SELECT session_id FROM session_participants WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage their locks"
  ON sheet_locks FOR INSERT
  WITH CHECK (locked_by = auth.uid());

CREATE POLICY "Users can release their locks"
  ON sheet_locks FOR DELETE
  USING (locked_by = auth.uid());

-- 11. Drawing Layers RLS
ALTER TABLE drawing_layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session participants can view layers"
  ON drawing_layers FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM sessions
      WHERE team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
      OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
      OR id IN (SELECT session_id FROM session_participants WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create layers"
  ON drawing_layers FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- 12. Drawing Shapes RLS
ALTER TABLE drawing_shapes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session participants can view shapes"
  ON drawing_shapes FOR SELECT
  USING (
    layer_id IN (
      SELECT id FROM drawing_layers
      WHERE session_id IN (
        SELECT id FROM sessions
        WHERE team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
        OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
        OR id IN (SELECT session_id FROM session_participants WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can create shapes"
  ON drawing_shapes FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- 13. Guest Sessions RLS
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session owner can view guest sessions"
  ON guest_sessions FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM sessions WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Anyone can view guest sessions with code"
  ON guest_sessions FOR SELECT
  USING (true);

CREATE POLICY "Session creator can create guest sessions"
  ON guest_sessions FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions WHERE created_by = auth.uid()
    )
  );
