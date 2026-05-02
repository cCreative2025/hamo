'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading, error, emailConfirmPending } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setPasswordError('비밀번호가 일치하지 않습니다');
      return;
    }

    setPasswordError('');
    try {
      await signup(email, password, name);
      // emailConfirmPending이면 페이지에서 메시지 표시, 아니면 리다이렉트
      if (!useAuthStore.getState().emailConfirmPending) {
        router.push('/sheets');
      }
    } catch {
      // error는 store에 저장됨
    }
  };

  // 이메일 인증 대기 화면
  if (emailConfirmPending) {
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
          <p className="text-neutral-500 text-sm mb-6">인증 메일을 발송했습니다. 링크를 클릭하면 로그인됩니다.</p>
          <a
            href="/auth/login"
            className="block w-full bg-neutral-900 hover:bg-neutral-700 text-white font-medium py-2.5 rounded-xl transition-colors text-center text-sm"
          >
            로그인 페이지로 이동
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
      <div className="bg-white rounded-2xl shadow-soft-lg p-8 w-full max-w-md">
        <div className="mb-8">
          <h1 className="type-display text-neutral-900">Hamo</h1>
          <p className="type-caption text-neutral-500 mt-1.5">악보 협업 앱</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block type-label text-neutral-700 mb-1.5">
              이름
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl text-neutral-900 bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              required
            />
          </div>

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

          <div>
            <label htmlFor="password" className="block type-label text-neutral-700 mb-1.5">
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

          <div>
            <label htmlFor="confirmPassword" className="block type-label text-neutral-700 mb-1.5">
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

          {passwordError && (
            <div className="bg-error-50 text-error-700 px-4 py-3 rounded-xl text-sm">
              {passwordError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-neutral-900 hover:bg-neutral-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            {isLoading ? '가입 중...' : '가입하기'}
          </button>
        </form>

        <p className="text-center text-neutral-500 text-sm mt-6">
          이미 계정이 있으신가요?{' '}
          <a href="/auth/login" className="text-primary-600 hover:underline font-medium">
            로그인하기
          </a>
        </p>
      </div>
    </div>
  );
}
