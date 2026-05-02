'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setIsLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
        <div className="bg-white rounded-2xl shadow-soft-lg p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="type-h1 text-neutral-900 mb-2">이메일을 확인해주세요</h2>
          <p className="text-neutral-500 text-sm mb-1">
            <span className="font-medium text-neutral-700">{email}</span>로
          </p>
          <p className="text-neutral-500 text-sm mb-6">비밀번호 재설정 링크를 발송했습니다.</p>
          <a
            href="/auth/login"
            className="block w-full bg-neutral-900 hover:bg-neutral-700 text-white font-medium py-2.5 rounded-xl transition-colors text-center text-sm"
          >
            로그인으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
      <div className="bg-white rounded-2xl shadow-soft-lg p-8 w-full max-w-md">
        <div className="mb-8">
          <h1 className="type-h1 text-neutral-900">비밀번호 찾기</h1>
          <p className="type-caption text-neutral-500 mt-1.5">가입한 이메일로 재설정 링크를 보내드립니다</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block type-label text-neutral-700 mb-1.5">
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
            {isLoading ? '발송 중...' : '재설정 링크 보내기'}
          </button>
        </form>

        <p className="text-center text-neutral-500 text-sm mt-6">
          <a href="/auth/login" className="text-primary-600 hover:underline font-medium">
            로그인으로 돌아가기
          </a>
        </p>
      </div>
    </div>
  );
}
