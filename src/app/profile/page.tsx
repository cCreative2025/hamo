'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { MainLayout } from '@/components/MainLayout';

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, updateProfile, isLoading, error, logout } = useAuthStore();
  const [name, setName] = useState(currentUser?.name || '');
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Redirect unauthenticated users after hydration — avoids SSG "location is not defined".
  useEffect(() => {
    if (!currentUser) router.replace('/auth/login');
  }, [currentUser, router]);

  if (!currentUser) {
    return null;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name === currentUser.name) return;
    try {
      await updateProfile(name.trim());
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
    } catch {
      // error는 store에 저장됨
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-8">
        <h2 className="type-h1 text-neutral-900 dark:text-neutral-100 mb-6">프로필</h2>

        {/* 아바타 */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {currentUser.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <p className="type-body-sm text-neutral-900 dark:text-neutral-100">{currentUser.name}</p>
            <p className="type-caption text-neutral-500 dark:text-neutral-400">{currentUser.email}</p>
          </div>
        </div>

        {/* 이름 수정 폼 */}
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label htmlFor="name" className="block type-label text-neutral-700 dark:text-neutral-300 mb-1.5">
              이름
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setSaved(false); }}
              className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              required
            />
          </div>

          <div>
            <label className="block type-label text-neutral-700 dark:text-neutral-300 mb-1.5">
              이메일
            </label>
            <p className="px-4 py-2.5 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-950 text-sm">
              {currentUser.email}
            </p>
            <p className="text-xs text-neutral-400 mt-1">이메일은 변경할 수 없습니다</p>
          </div>

          {error && (
            <div className="bg-error-50 text-error-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {saved && (
            <div className="bg-success-50 text-success-700 px-4 py-3 rounded-xl text-sm">
              저장되었습니다
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || name === currentUser.name || !name.trim()}
            className="w-full bg-neutral-900 hover:bg-neutral-700 disabled:opacity-40 text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            {isLoading ? '저장 중...' : '저장'}
          </button>
        </form>

        {/* 로그아웃 */}
        <div className="mt-10 pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={handleLogout}
            className="w-full text-error-600 dark:text-error-400 border border-error-200 dark:border-error-900 hover:bg-error-50 dark:hover:bg-error-900/20 font-medium py-2.5 rounded-xl transition-colors text-sm"
          >
            로그아웃
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
