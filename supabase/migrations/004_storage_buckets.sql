-- Storage bucket: sheets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sheets',
  'sheets',
  true,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: 인증된 사용자 업로드
CREATE POLICY "Authenticated users can upload sheets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sheets');

-- RLS: 공개 읽기
CREATE POLICY "Public read access for sheets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'sheets');

-- RLS: 소유자만 삭제
CREATE POLICY "Owners can delete their sheets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'sheets' AND auth.uid() = owner);
