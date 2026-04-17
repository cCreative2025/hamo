'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  // URL 해시에서 access_token 감지 — Supabase가 자동으로 세션 처리
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다');
      return;
    }

    setIsLoading(true);
    setError('');

    const { error } = await supabase.auth.updateUser({ password });

    setIsLoading(false);

    if (error) {
      setError(error.message);
    } else {
      router.push('/auth/login?reset=success');
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 mb-3">
            <div className="w-7 h-7 border-3 border-white/40 border-t-white rounded-full animate-spin" />
          </div>
          <p className="text-white/80 text-sm">링크 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
      <div className="bg-white rounded-2xl shadow-soft-lg p-8 w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">새 비밀번호 설정</h1>
          <p className="text-neutral-500 mt-1.5 text-sm">새로운 비밀번호를 입력해주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1.5">
              새 비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl text-neutral-900 bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              required
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-1.5">
              비밀번호 확인
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl text-neutral-900 bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              required
            />
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
            {isLoading ? '저장 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>
    </div>
  );
}
