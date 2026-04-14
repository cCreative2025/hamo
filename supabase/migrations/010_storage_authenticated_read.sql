-- 인증된 사용자가 자신의 파일에 signed URL 생성 가능하도록 수정
-- (기존 public read 정책 제거 후 authenticated read로 교체)

DROP POLICY IF EXISTS "Public read access for sheets" ON storage.objects;

CREATE POLICY "Authenticated users can read own sheets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'sheets' AND auth.uid()::text = (storage.foldername(name))[1]);
