'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

// Zustand 스토어 직접 접근 (리액트 외부)
const getAuthState = () => useAuthStore.getState();

const SAVED_EMAIL_KEY = 'hamo_saved_email';
const AUTO_LOGIN_KEY  = 'hamo_auto_login';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [checking, setChecking] = useState(true);

  // 저장된 설정 불러오기 + 자동로그인 체크
  useEffect(() => {
    const savedEmail = localStorage.getItem(SAVED_EMAIL_KEY);
    const savedAuto  = localStorage.getItem(AUTO_LOGIN_KEY) === 'true';
    if (savedEmail) { setEmail(savedEmail); setRememberMe(true); }
    setAutoLogin(savedAuto);

    const check = async () => {
      if (savedAuto) {
        // 자동 로그인 ON일 때만 세션 확인
        await getAuthState().checkAuth();
        // checkAuth() 결과만 신뢰 — 스토어 외부 상태 변화 무시
        if (getAuthState().isAuthenticated) {
          router.replace('/sheets');
          return;
        }
      }
      setChecking(false);
    };
    check();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(AUTO_LOGIN_KEY, autoLogin ? 'true' : 'false');
    if (rememberMe) {
      localStorage.setItem(SAVED_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }
    try {
      await login(email, password);
      router.push('/sheets');
    } catch {
      // error는 store에 저장됨
    }
  };

  // 세션 확인 중 스피너
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 mb-3">
            <div className="w-7 h-7 border-3 border-white/40 border-t-white rounded-full animate-spin" />
          </div>
          <p className="text-white/80 text-sm">확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
      <div className="bg-white rounded-2xl shadow-soft-lg p-8 w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Hamo</h1>
          <p className="text-neutral-500 mt-1.5 text-sm">악보 협업 앱</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1.5">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl text-neutral-900 bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1.5">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl text-neutral-900 bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              required
            />
          </div>

          {/* 로그인 저장 + 자동 로그인 */}
          <div className="flex items-center gap-5">
            {([
              { key: 'rememberMe', label: '로그인 저장',  value: rememberMe, set: setRememberMe },
              { key: 'autoLogin',  label: '자동 로그인', value: autoLogin,   set: setAutoLogin  },
            ] as const).map(({ key, label, value, set }) => (
              <button
                key={key}
                type="button"
                onClick={() => set(v => !v)}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <div
                  className={`flex items-center justify-center rounded border transition-colors flex-shrink-0 ${
                    value ? 'bg-neutral-900 border-neutral-900' : 'bg-white border-neutral-300'
                  }`}
                  style={{ width: 18, height: 18 }}
                >
                  {value && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-neutral-600">{label}</span>
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-error-50 text-error-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-neutral-900 hover:bg-neutral-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-neutral-500 text-sm mt-6">
          계정이 없으신가요?{' '}
          <a href="/auth/signup" className="text-primary-600 hover:underline font-medium">
            가입하기
          </a>
        </p>
      </div>
    </div>
  );
}
