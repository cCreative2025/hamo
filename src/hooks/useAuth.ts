import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export const useAuth = (protectedRoute: boolean = false) => {
  const router = useRouter();
  const { currentUser, isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
    };

    initAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && protectedRoute && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, protectedRoute, router]);

  return {
    currentUser,
    isAuthenticated,
    isLoading,
  };
};
