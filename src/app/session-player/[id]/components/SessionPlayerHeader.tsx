'use client';

import React from 'react';
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
  const { userRole } = useSessionPlayerStore();

  // Get current item
  const currentItem = items[currentIndex];

  // Determine role badge
  const roleBadgeText = {
    creator: '팀장',
    member: '팀원',
    guest: '객원',
  }[userRole];

  const roleBadgeColor = {
    creator: 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300',
    member: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
    guest: 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300',
  }[userRole];

  // Get item title
  const itemTitle =
    currentItem?.type === 'song'
      ? currentItem.song_form?.name || currentItem.sheet?.title || '(제목 없음)'
      : `[멘트] ${(currentItem?.ment_text || '').substring(0, 30)}${(currentItem?.ment_text || '').length > 30 ? '...' : ''}`;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
      {/* Left: Session name */}
      <div className="flex-1">
        <h1 className="text-lg font-bold text-neutral-900 dark:text-white truncate">
          {session.name || session.title || '세션'}
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {itemTitle}
        </p>
      </div>

      {/* Center: Role badge */}
      <div className={`px-3 py-1 rounded-full text-xs font-medium mx-4 whitespace-nowrap ${roleBadgeColor}`}>
        {roleBadgeText}
      </div>

      {/* Right: Close button */}
      <button
        onClick={() => router.back()}
        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
        aria-label="닫기"
      >
        <svg className="w-5 h-5 text-neutral-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
