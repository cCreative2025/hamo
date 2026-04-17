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
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
}

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
        set({
          currentUser: user,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false,
      });
      throw error;
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
        set({ currentUser: user, isAuthenticated: true, isLoading: false });
      } else if (data.user && !data.session) {
        // 이메일 인증 대기 중
        set({ isLoading: false, emailConfirmPending: true });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Signup failed',
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
