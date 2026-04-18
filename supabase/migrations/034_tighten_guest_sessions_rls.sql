-- Tighten guest_sessions visibility.
--
-- Previously (002_rls_policies.sql) the table allowed SELECT to anyone:
--   CREATE POLICY "Anyone can view guest sessions with code"
--     ON guest_sessions FOR SELECT USING (true);
--
-- That let anonymous callers enumerate every guest code. Replace with two
-- narrower policies:
--   1. Session owner can read rows for their own sessions (management UX).
--   2. Anonymous/guest read is only possible for a specific row when the
--      caller already knows the code — i.e. we allow reads that are filtered
--      by code. Since RLS evaluates the WHERE clause as part of the query,
--      we cannot literally require a filter in SQL. Instead we accept that
--      a successful lookup needs the code and rely on the fact that codes
--      are random/unguessable; the policy restricts response shape to what
--      the code-holder legitimately needs (session_id + expires_at).
--
-- To prevent bulk enumeration (SELECT * FROM guest_sessions), we drop the
-- permissive SELECT and add a security-definer RPC `resolve_guest_code`
-- that clients use to exchange a code for a session_id. The table itself
-- becomes readable only by the session creator.

DROP POLICY IF EXISTS "Anyone can view guest sessions with code" ON guest_sessions;

CREATE POLICY "Session creator can view guest sessions"
  ON guest_sessions FOR SELECT
  USING (
    created_by = auth.uid()
    OR session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
  );

-- RPC for unauthenticated/authenticated clients to look up a guest code.
-- Runs as SECURITY DEFINER so it can read the table regardless of caller.
CREATE OR REPLACE FUNCTION resolve_guest_code(p_code text)
RETURNS TABLE(session_id uuid, expires_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT session_id, expires_at
  FROM guest_sessions
  WHERE code = p_code
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION resolve_guest_code(text) FROM public;
GRANT EXECUTE ON FUNCTION resolve_guest_code(text) TO anon, authenticated;

-- Also update last_accessed without exposing the row:
CREATE OR REPLACE FUNCTION touch_guest_code(p_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE guest_sessions
  SET last_accessed = now(),
      access_count = COALESCE(access_count, 0) + 1
  WHERE code = p_code
    AND (expires_at IS NULL OR expires_at > now());
$$;

REVOKE ALL ON FUNCTION touch_guest_code(text) FROM public;
GRANT EXECUTE ON FUNCTION touch_guest_code(text) TO anon, authenticated;
