-- 036_users_email_nullable.sql
-- 카카오 OAuth 로그인은 비즈 앱 전환 전까지 account_email 권한이 없어
-- 이메일 없이 가입되는 사용자가 발생함. email 컬럼의 NOT NULL 제약을 풀고,
-- handle_new_user 트리거도 NULL 이메일을 허용하도록 갱신.

ALTER TABLE public.users
  ALTER COLUMN email DROP NOT NULL;

-- UNIQUE 제약은 유지: PostgreSQL은 NULL 값은 UNIQUE 위반으로 보지 않으므로
-- 이메일 없는 사용자가 여럿이어도 충돌하지 않음.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, created_at)
  VALUES (
    NEW.id,
    NULLIF(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'nickname',
      NEW.raw_user_meta_data->>'preferred_username',
      split_part(COALESCE(NEW.email, ''), '@', 1),
      '사용자'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.users.email),
        name = COALESCE(EXCLUDED.name, public.users.name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
