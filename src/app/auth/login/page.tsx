'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

const AUTO_LOGIN_KEY = 'hamo_auto_login';

const getAuthState = () => useAuthStore.getState();

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithKakao, error } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const oauthError = searchParams.get('error');

  useEffect(() => {
    const savedAuto = localStorage.getItem(AUTO_LOGIN_KEY) === 'true';
    const check = async () => {
      if (savedAuto) {
        await getAuthState().checkAuth();
        if (getAuthState().isAuthenticated) {
          router.replace('/sheets');
          return;
        }
      }
      setChecking(false);
    };
    check();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKakao = async () => {
    localStorage.setItem(AUTO_LOGIN_KEY, 'true');
    setSubmitting(true);
    try {
      await loginWithKakao();
    } catch {
      setSubmitting(false);
    }
  };

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary px-4">
      <div className="bg-white rounded-2xl shadow-soft-lg p-8 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-neutral-900">Hamo</h1>
          <p className="text-neutral-500 mt-1.5 text-sm">악보 협업 앱</p>
        </div>

        <p className="text-neutral-600 text-sm text-center mb-6">
          카카오 계정으로 간편하게 로그인하세요
        </p>

        {(error || oauthError) && (
          <div className="bg-error-50 text-error-700 px-4 py-3 rounded-xl text-sm mb-4">
            {error || '로그인에 실패했습니다. 다시 시도해주세요.'}
          </div>
        )}

        <button
          type="button"
          onClick={handleKakao}
          disabled={submitting}
          className="w-full bg-[#FEE500] hover:bg-[#FDD835] disabled:opacity-50 text-[#191919] font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 3C6.48 3 2 6.58 2 11c0 2.85 1.86 5.35 4.66 6.78l-1.18 4.32c-.1.36.31.65.62.45L11.36 19c.21.01.42.02.64.02 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
          </svg>
          {submitting ? '이동 중...' : '카카오로 시작하기'}
        </button>

        <p className="text-neutral-400 text-xs text-center mt-6">
          로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
