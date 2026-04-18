-- 033_save_session_items_rpc.sql
-- Atomic save of session metadata + setlist items in a single transaction.
-- Replaces the 3-call client flow (UPDATE sessions, DELETE session_songs,
-- INSERT session_songs) to prevent partial failures that wipe the setlist.

CREATE OR REPLACE FUNCTION save_session_items(
  p_session_id uuid,
  p_team_id    uuid,
  p_items      jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_item jsonb;
BEGIN
  -- 1) Update session team_id
  UPDATE sessions
     SET team_id = p_team_id
   WHERE id = p_session_id;

  -- 2) Delete existing setlist items
  DELETE FROM session_songs
   WHERE session_id = p_session_id;

  -- 3) Insert new items from jsonb array
  IF p_items IS NOT NULL AND jsonb_typeof(p_items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      IF (v_item->>'type') = 'song' THEN
        INSERT INTO session_songs (
          session_id,
          type,
          sheet_id,
          song_form_id,
          sequence_order
        ) VALUES (
          p_session_id,
          'song',
          NULLIF(v_item->>'sheet_id', '')::uuid,
          NULLIF(v_item->>'song_form_id', '')::uuid,
          (v_item->>'sequence_order')::int
        );
      ELSIF (v_item->>'type') = 'ment' THEN
        INSERT INTO session_songs (
          session_id,
          type,
          ment_text,
          sequence_order
        ) VALUES (
          p_session_id,
          'ment',
          v_item->>'ment_text',
          (v_item->>'sequence_order')::int
        );
      ELSE
        RAISE EXCEPTION 'Unknown session item type: %', v_item->>'type';
      END IF;
    END LOOP;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION save_session_items(uuid, uuid, jsonb) TO authenticated;
