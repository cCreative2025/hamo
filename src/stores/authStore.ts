import { create } from 'zustand';
import { User } from '@/types';
import { supabase } from '@/lib/supabase';

interface AuthStore {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  emailConfirmPending: boolean;

  // Actions
  setCurrentUser: (user: User | null) => void;
  setIsAuthenticated: (authenticated: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Auth methods
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithKakao: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
}

/**
 * Supabase Auth 영문 에러를 친근한 한국어로 매핑.
 * 알 수 없는 에러는 원문 그대로 노출 (디버깅 정보 보존).
 */
const humanizeAuthError = (err: unknown, fallback: string): string => {
  const raw = err instanceof Error ? err.message : String(err ?? fallback);
  const lower = raw.toLowerCase();
  if (lower.includes('email rate limit')) {
    return '이메일 발송 한도를 초과했습니다. 잠시 후(약 1시간) 다시 시도해주세요.';
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return '이미 가입된 이메일입니다. 로그인해주세요.';
  }
  if (lower.includes('invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  if (lower.includes('email address') && lower.includes('invalid')) {
    return '유효하지 않은 이메일 주소입니다.';
  }
  if (lower.includes('password') && lower.includes('should be at least')) {
    return '비밀번호는 6자 이상이어야 합니다.';
  }
  if (lower.includes('email not confirmed')) {
    return '이메일 인증이 필요합니다. 받은 메일에서 인증 링크를 눌러주세요.';
  }
  if (lower.includes('captcha')) {
    return 'CAPTCHA 검증에 실패했습니다.';
  }
  if (lower.includes('legacy api keys')) {
    return '서버 설정 오류 (legacy keys). 관리자에게 문의해주세요.';
  }
  return raw;
};

const upsertProfile = async (authUser: { id: string; email?: string | null; user_metadata?: Record<string, string>; created_at?: string }) => {
  await supabase.from('users').upsert({
    id: authUser.id,
    email: authUser.email || '',
    name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '',
    avatar_url: authUser.user_metadata?.avatar_url || null,
    created_at: authUser.created_at || new Date().toISOString(),
  }, { onConflict: 'id' });
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isLoading: true,  // 초기 auth 체크 전까지 로딩 상태 유지
  error: null,
  emailConfirmPending: false,

  setCurrentUser: (user) => set({ currentUser: user }),
  setIsAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      if (data.user) {
        await upsertProfile(data.user);
        const user: User = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || '',
          avatar_url: data.user.user_metadata?.avatar_url,
          created_at: data.user.created_at || new Date().toISOString(),
        };
        set({ currentUser: user, isAuthenticated: true });
      } else {
        // GoTrue가 200 OK 인데 user 없음 — 방어적 처리
        throw new Error('로그인 응답이 비어 있습니다. 잠시 후 다시 시도해주세요.');
      }
    } catch (error) {
      set({ error: humanizeAuthError(error, 'Login failed') });
      throw error;
    } finally {
      // path 누락이나 await 도중 예외 발생해도 항상 isLoading 해제
      set({ isLoading: false });
    }
  },

  signup: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null, emailConfirmPending: false });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (error) throw error;

      if (data.user && data.session) {
        // 이메일 인증 없이 즉시 로그인
        await upsertProfile({ ...data.user, user_metadata: { name } });
        const user: User = {
          id: data.user.id,
          email: data.user.email || '',
          name: name,
          created_at: data.user.created_at || new Date().toISOString(),
        };
        set({ currentUser: user, isAuthenticated: true });
      } else if (data.user && !data.session) {
        // 이메일 인증 대기 중
        set({ emailConfirmPending: true });
      } else {
        // 응답에 user 자체가 없음 — 발생하면 안 되지만 hang 방지
        throw new Error('가입 응답이 비어 있습니다. 잠시 후 다시 시도해주세요.');
      }
    } catch (error) {
      set({ error: humanizeAuthError(error, 'Signup failed') });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithKakao: async () => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      set({
        error: humanizeAuthError(error, '카카오 로그인 실패'),
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      set({
        currentUser: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Logout failed',
        isLoading: false,
      });
      throw error;
    }
  },

  updateProfile: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error: authError } = await supabase.auth.updateUser({ data: { name } });
      if (authError) throw authError;

      const currentUser = get().currentUser;
      if (currentUser) {
        const { error: dbError } = await supabase.from('users').update({ name }).eq('id', currentUser.id);
        if (dbError) throw dbError;
        set({ currentUser: { ...currentUser, name }, isLoading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Profile update failed',
        isLoading: false,
      });
      throw error;
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await upsertProfile(session.user);
        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || '',
          avatar_url: session.user.user_metadata?.avatar_url,
          created_at: session.user.created_at || new Date().toISOString(),
        };
        set({
          currentUser: user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          currentUser: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Auth check failed',
        isLoading: false,
      });
    }
  },
}));
