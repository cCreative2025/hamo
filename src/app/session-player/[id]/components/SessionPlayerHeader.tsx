'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Session, SessionItem } from '@/types';
import { useSessionPlayerStore } from '@/stores/sessionPlayerStore';

interface SessionPlayerHeaderProps {
  session: Session;
  currentIndex: number;
  items: SessionItem[];
}

export function SessionPlayerHeader({ session, currentIndex, items }: SessionPlayerHeaderProps) {
  const router = useRouter();
  const { userRole, navigateToSong } = useSessionPlayerStore();

  const canNavigate = userRole === 'creator';
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === items.length - 1;

  const handlePrev = useCallback(() => {
    if (canNavigate && !isFirst) navigateToSong(currentIndex - 1);
  }, [canNavigate, isFirst, currentIndex, navigateToSong]);

  const handleNext = useCallback(() => {
    if (canNavigate && !isLast) navigateToSong(currentIndex + 1);
  }, [canNavigate, isLast, currentIndex, navigateToSong]);

  const currentItem = items[currentIndex];
  const itemTitle =
    currentItem?.type === 'song'
      ? currentItem.song_form?.name || currentItem.sheet?.title || '(제목 없음)'
      : `[멘트] ${(currentItem?.ment_text || '').substring(0, 20)}`;

  const roleBadgeColor = {
    creator: 'bg-primary-100 text-primary-700',
    member: 'bg-blue-100 text-blue-700',
    guest: 'bg-neutral-100 text-neutral-600',
  }[userRole];

  const roleBadgeText = { creator: '팀장', member: '팀원', guest: '객원' }[userRole];

  return (
    <div className="flex-shrink-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
      {/* Row 1: session name + role + close */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <span className="text-xs text-neutral-400 dark:text-neutral-500 truncate flex-1">
          {session.name || session.title || '세션'}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${roleBadgeColor}`}>
          {roleBadgeText}
        </span>
        <button
          onClick={() => router.back()}
          className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors flex-shrink-0"
          aria-label="닫기"
        >
          <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Row 2: prev | song name + counter | next */}
      <div className="flex items-center px-2 pb-2 gap-1">
        <button
          onClick={handlePrev}
          disabled={!canNavigate || isFirst}
          className="p-2 rounded-lg transition-colors disabled:opacity-30 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex-shrink-0"
          aria-label="이전"
        >
          <svg className="w-5 h-5 text-neutral-700 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex-1 text-center min-w-0 px-1">
          <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{itemTitle}</p>
          <p className="text-xs text-neutral-400 mt-0.5">{currentIndex + 1} / {items.length}</p>
        </div>

        <button
          onClick={handleNext}
          disabled={!canNavigate || isLast}
          className="p-2 rounded-lg transition-colors disabled:opacity-30 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex-shrink-0"
          aria-label="다음"
        >
          <svg className="w-5 h-5 text-neutral-700 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
