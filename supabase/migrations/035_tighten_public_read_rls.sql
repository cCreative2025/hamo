-- Tighten overly permissive SELECT policies and provide SECURITY DEFINER
-- RPCs for the guest-mode read paths that used to rely on them.
--
-- Overview of what changes:
--   sheets                : public read  → owner/team/session-accessor
--   sheet_versions        : public read  → scoped to sheets the caller can see
--   song_forms            : public read  → creator or sheet-accessor or session-accessor
--   session_songs         : public read  → session creator / team members
--   session_layers        : public read  → scoped to session accessors (superset already existed; drop the USING(true))
--   sessions              : no change to creator/team policy; add ability for
--                           session_participants to read (already in 002).
--   storage.objects/sheets: drop "any session_songs" public read; rely on
--                           signed-url route for guests.
--
-- Guest flows get a SECURITY DEFINER function `guest_load_session_bundle(code)`
-- that returns everything the guest session player needs in one call.

BEGIN;

-- ── Drop the over-permissive SELECT policies ────────────────────────────────
DROP POLICY IF EXISTS "Sheets are publicly readable" ON sheets;
DROP POLICY IF EXISTS "Public can view sheets" ON sheets;                    -- legacy duplicate
DROP POLICY IF EXISTS "Sheet versions are publicly readable" ON sheet_versions;
DROP POLICY IF EXISTS "Song forms are publicly readable" ON song_forms;
DROP POLICY IF EXISTS "Public can view song_forms" ON song_forms;            -- legacy duplicate
DROP POLICY IF EXISTS "session_songs_select" ON session_songs;
-- 023 re-added "View session_layers" with USING(true) on top of 019's narrower
-- policy; drop both and re-create just the narrow one below.
DROP POLICY IF EXISTS "View session_layers" ON session_layers;
DROP POLICY IF EXISTS "session_layers_select" ON session_layers;

-- storage.objects: drop the broad "any file in any session_songs" policy.
DROP POLICY IF EXISTS "Session sheets are readable" ON storage.objects;

-- ── Replacement policies ────────────────────────────────────────────────────

-- sheets: owner, their teams, OR a sheet referenced in a session the caller
-- has access to (creator or team member). session_participants removed to
-- keep the policy tractable — guests use the RPC path.
CREATE POLICY "Users can view sheets (scoped)"
  ON sheets FOR SELECT
  USING (
    owner_id = auth.uid()
    OR team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
    OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR id IN (
      SELECT ss.sheet_id
      FROM session_songs ss
      JOIN sessions s ON s.id = ss.session_id
      WHERE ss.sheet_id IS NOT NULL
        AND (
          s.created_by = auth.uid()
          OR s.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
        )
    )
  );

-- sheet_versions: visible when parent sheet is visible.
CREATE POLICY "Users can view sheet versions (scoped)"
  ON sheet_versions FOR SELECT
  USING (
    sheet_id IN (SELECT id FROM sheets)
  );

-- song_forms: creator, or attached to a visible sheet, or referenced by a
-- session the caller accesses.
CREATE POLICY "Users can view song forms (scoped)"
  ON song_forms FOR SELECT
  USING (
    created_by = auth.uid()
    OR sheet_id IN (SELECT id FROM sheets)
    OR id IN (
      SELECT ss.song_form_id
      FROM session_songs ss
      JOIN sessions s ON s.id = ss.session_id
      WHERE ss.song_form_id IS NOT NULL
        AND (
          s.created_by = auth.uid()
          OR s.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
        )
    )
  );

-- session_songs: session creator or team member.
CREATE POLICY "session_songs_select"
  ON session_songs FOR SELECT
  USING (
    session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
    OR session_id IN (
      SELECT s.id FROM sessions s
      JOIN team_members tm ON tm.team_id = s.team_id
      WHERE tm.user_id = auth.uid()
        AND s.team_id IS NOT NULL
    )
  );

-- session_layers: creator, session creator, or team member with any role.
CREATE POLICY "session_layers_select"
  ON session_layers FOR SELECT
  USING (
    created_by = auth.uid()
    OR session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
    OR session_id IN (
      SELECT s.id FROM sessions s
      JOIN team_members tm ON tm.team_id = s.team_id
      WHERE tm.user_id = auth.uid()
        AND s.team_id IS NOT NULL
    )
  );

-- storage.objects: only owner can read their own folder directly.
-- Guests and cross-team reads go through the /api/signed-url route, which
-- uses the service-role key server-side after validating auth or guestCode.
-- ("Owner can read own sheets" from 021 is preserved.)

COMMIT;

-- ── Guest bundle RPC ────────────────────────────────────────────────────────
-- Single round-trip payload the guest session-player needs.
-- SECURITY DEFINER so it can read through the now-private tables after the
-- guest code has been validated. The function only exposes the specific
-- session referenced by a valid, unexpired code.

CREATE OR REPLACE FUNCTION guest_load_session_bundle(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_result jsonb;
BEGIN
  SELECT session_id INTO v_session_id
  FROM guest_sessions
  WHERE code = p_code
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'session', (
      SELECT to_jsonb(s) FROM sessions s WHERE s.id = v_session_id
    ),
    'items', COALESCE((
      SELECT jsonb_agg(
        to_jsonb(ss)
          || jsonb_build_object(
               'sheet',
               CASE
                 WHEN ss.sheet_id IS NULL THEN NULL
                 ELSE (
                   SELECT to_jsonb(sh)
                     || jsonb_build_object(
                          'sheet_versions', COALESCE(
                            (SELECT jsonb_agg(to_jsonb(sv)) FROM sheet_versions sv WHERE sv.sheet_id = sh.id),
                            '[]'::jsonb
                          ),
                          'song_forms', COALESCE(
                            (SELECT jsonb_agg(to_jsonb(sf)) FROM song_forms sf WHERE sf.sheet_id = sh.id),
                            '[]'::jsonb
                          )
                        )
                   FROM sheets sh WHERE sh.id = ss.sheet_id
                 )
               END
             )
        ORDER BY ss.sequence_order
      )
      FROM session_songs ss
      WHERE ss.session_id = v_session_id
    ), '[]'::jsonb),
    'layers', COALESCE((
      SELECT jsonb_agg(to_jsonb(sl))
      FROM session_layers sl
      WHERE sl.session_id = v_session_id
    ), '[]'::jsonb)
  )
  INTO v_result;

  -- Best-effort access tracking
  UPDATE guest_sessions
  SET last_accessed = now(),
      access_count = COALESCE(access_count, 0) + 1
  WHERE code = p_code;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION guest_load_session_bundle(text) FROM public;
GRANT EXECUTE ON FUNCTION guest_load_session_bundle(text) TO anon, authenticated;
