-- public.users INSERT 정책 추가 (클라이언트에서 자신의 프로필 생성 가능)
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);
