-- teams <-> team_members 순환 참조 RLS 버그 수정

-- 1. 순환 유발하는 정책 제거
DROP POLICY IF EXISTS "Team members can view their teams" ON teams;
DROP POLICY IF EXISTS "Team members can view team members" ON team_members;

-- 2. RLS 우회 헬퍼 함수 (SECURITY DEFINER = RLS 없이 직접 조회)
CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. teams 정책 재생성 (함수 사용 → 순환 없음)
CREATE POLICY "Team members can view their teams"
  ON teams FOR SELECT
  USING (
    owner_id = auth.uid() OR
    public.is_team_member(id)
  );

-- 4. team_members 정책 재생성 (자신의 row + 팀 오너만 — teams 참조 없음)
CREATE POLICY "Team members can view team members"
  ON team_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );
