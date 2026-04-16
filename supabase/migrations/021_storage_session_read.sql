-- Allow any user (including anon/guest) to read sheet files
-- that belong to sheets included in any session's setlist.
-- Signed URL creation also requires SELECT on storage.objects.

DROP POLICY IF EXISTS "Authenticated users can read own sheets" ON storage.objects;

-- Owner: full read access to own folder
CREATE POLICY "Owner can read own sheets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'sheets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Session participant: read sheet files that are in any session setlist
CREATE POLICY "Session sheets are readable"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'sheets'
    AND EXISTS (
      SELECT 1
      FROM session_songs ss
      JOIN sheet_versions sv ON sv.sheet_id = ss.sheet_id
      WHERE sv.file_path = storage.objects.name
        AND ss.sheet_id IS NOT NULL
    )
  );
