'use client';

import React from 'react';
import { SessionItem } from '@/types';
import { useSessionPlayerStore } from '@/stores/sessionPlayerStore';

interface MentDisplayProps {
  item: SessionItem;
  onTouchStart?: React.TouchEventHandler;
  onTouchEnd?: React.TouchEventHandler;
}

export function MentDisplay({ item, onTouchStart, onTouchEnd }: MentDisplayProps) {
  const { userRole, navigateToSong, currentIndex, items } = useSessionPlayerStore();

  const canSkip = userRole === 'creator';
  const isLast = currentIndex === items.length - 1;

  const handleSkip = () => {
    if (canSkip && !isLast) {
      navigateToSong(currentIndex + 1);
    }
  };

  return (
    <div className="flex-1 min-h-0 bg-gradient-to-br from-primary-600 to-primary-700 dark:from-primary-900 dark:to-primary-950 flex items-center justify-center p-6" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="flex flex-col items-center justify-center text-center max-w-2xl">
        {/* Ment text */}
        <div className="mb-8">
          <p className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            {item.ment_text || '(내용 없음)'}
          </p>
        </div>

        {/* Skip button (creators only) */}
        {canSkip && !isLast && (
          <button
            onClick={handleSkip}
            className="px-6 py-2 bg-white text-primary-600 rounded-lg font-semibold hover:bg-neutral-100 transition-colors"
          >
            다음으로 넘어가기
          </button>
        )}

        {/* Info text */}
        <p className="text-white text-opacity-70 text-sm mt-6">
          {!canSkip && '팀장이 다음 곡으로 넘길 때까지 기다립니다...'}
          {canSkip && isLast && '마지막 항목입니다'}
        </p>
      </div>
    </div>
  );
}
