'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

const SAVED_EMAIL_KEY = 'hamo_saved_email';

export default function LoginPage() {
  const router = useRouter();
  const { login, checkAuth, isLoading, isAuthenticated, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [checking, setChecking] = useState(true);

  // 자동로그인 체커: 유효 세션 있으면 바로 이동
  useEffect(() => {
    const check = async () => {
      await checkAuth();
      setChecking(false);
    };
    check();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!checking && isAuthenticated) {
      router.replace('/sheets');
    }
  }, [checking, isAuthenticated, router]);

  // 저장된 이메일 불러오기
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

          {/* 로그인 저장 */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => setRememberMe(v => !v)}
              className={`w-4.5 h-4.5 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${
                rememberMe ? 'bg-neutral-900 border-neutral-900' : 'bg-white border-neutral-300'
              }`}
              style={{ width: 18, height: 18 }}
            >
              {rememberMe && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-sm text-neutral-600" onClick={() => setRememberMe(v => !v)}>
              로그인 저장
            </span>
          </label>

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
