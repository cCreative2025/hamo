'use client';

import React, { useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSessionPlayerStore } from '@/stores/sessionPlayerStore';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import { SessionPlayerHeader } from './components/SessionPlayerHeader';
import { SessionPlayerMain } from './components/SessionPlayerMain';
import { SessionPlayerFooter } from './components/SessionPlayerFooter';
import { setGuestCode } from '@/lib/signedUrlCache';

function SessionPlayerContent() {
  const { currentUser } = useAuthStore();
  const searchParams = useSearchParams();
  const isGuest = searchParams.get('guest') === 'true';
  const guestCode = searchParams.get('code');

  // Register guest code for signed-url requests in this session.
  useEffect(() => {
    setGuestCode(isGuest ? guestCode : null);
    return () => setGuestCode(null);
  }, [isGuest, guestCode]);

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
    navigateLocal,
  } = useSessionPlayerStore();

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigateLocal(currentIndex + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navigateLocal(currentIndex - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIndex, navigateLocal]);

  // Initialize session on mount
  useEffect(() => {
    let active = true;

    if (sessionId) {
      initSession(sessionId, currentUser || null, isGuest, guestCode)
        .then(() => {
          if (active && !isGuest) {
            // Guests don't need Realtime (read-only snapshot from RPC).
            subscribeToSession(sessionId);
          }
        })
        .catch(() => {
          // Error handled in store
        });
    }

    return () => {
      active = false;
      unsubscribeFromSession();
      cleanup();
    };
  }, [sessionId, currentUser, isGuest, guestCode, initSession, subscribeToSession, unsubscribeFromSession, cleanup]);

  if (isLoading || (!session && !error)) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-neutral-50 dark:bg-neutral-900">
        <LoadingSpinner text="세션을 불러오는 중..." />
      </div>
    );
  }

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

export default function SessionPlayerPage() {
  return (
    <Suspense>
      <SessionPlayerContent />
    </Suspense>
  );
}
