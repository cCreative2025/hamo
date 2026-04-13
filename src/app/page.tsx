'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    } else if (!isLoading && isAuthenticated) {
      router.push('/sheets');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-primary">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-4">Hamo</h1>
        <p className="text-xl">악보 협업 앱을 로딩 중입니다...</p>
      </div>
    </div>
  );
}
