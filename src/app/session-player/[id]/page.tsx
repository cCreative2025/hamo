'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSessionPlayerStore } from '@/stores/sessionPlayerStore';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import { SessionPlayerHeader } from './components/SessionPlayerHeader';
import { SessionPlayerMain } from './components/SessionPlayerMain';
import { SessionPlayerFooter } from './components/SessionPlayerFooter';

export default function SessionPlayerPage() {
  // Check authentication (optional for guest)
  const { currentUser } = useAuthStore();
  const searchParams = useSearchParams();
  const isGuest = searchParams.get('guest') === 'true';

  useAuth(!isGuest); // Protected route unless guest

  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const {
    session,
    items,
    currentIndex,
    isLoading,
    error,
    isFullscreen,
    initSession,
    subscribeToSession,
    unsubscribeFromSession,
    cleanup,
  } = useSessionPlayerStore();

  // Initialize session on mount
  useEffect(() => {
    if (sessionId) {
      initSession(sessionId, currentUser || null, isGuest)
        .then(() => {
          subscribeToSession(sessionId);
        })
        .catch(() => {
          // Error handled in store
        });
    }

    return () => {
      unsubscribeFromSession();
      cleanup();
    };
  }, [sessionId, currentUser, isGuest, initSession, subscribeToSession, unsubscribeFromSession, cleanup]);

  // Loading state (isLoading OR session not yet loaded)
  if (isLoading || (!session && !error)) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-neutral-50 dark:bg-neutral-900">
        <LoadingSpinner text="세션을 불러오는 중..." />
      </div>
    );
  }

  // Error state
  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="text-center">
          <p className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            세션을 불러올 수 없습니다
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
            {error || '세션이 존재하지 않습니다'}
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-white dark:bg-neutral-900 flex flex-col overflow-hidden">
      {!isFullscreen && (
        <SessionPlayerHeader session={session} currentIndex={currentIndex} items={items} />
      )}
      <SessionPlayerMain currentIndex={currentIndex} items={items} />
      {!isFullscreen && (
        <SessionPlayerFooter items={items} currentIndex={currentIndex} />
      )}
    </div>
  );
}
