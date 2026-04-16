'use client';

import React, { useCallback } from 'react';
import { SessionItem } from '@/types';
import { useSessionPlayerStore } from '@/stores/sessionPlayerStore';
import { Button } from '@/components/Button';

interface SessionPlayerFooterProps {
  items: SessionItem[];
  currentIndex: number;
}

export function SessionPlayerFooter({ items, currentIndex }: SessionPlayerFooterProps) {
  const { userRole, navigateToSong } = useSessionPlayerStore();

  const canNavigate = userRole === 'creator';
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === items.length - 1;

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0 && canNavigate) {
      navigateToSong(currentIndex - 1);
    }
  }, [currentIndex, canNavigate, navigateToSong]);

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1 && canNavigate) {
      navigateToSong(currentIndex + 1);
    }
  }, [currentIndex, items.length, canNavigate, navigateToSong]);

  return (
    <div className="px-4 py-3 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700">
      {/* Navigation buttons */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          size="sm"
          variant={canNavigate && !isFirst ? 'primary' : 'secondary'}
          onClick={handlePrevious}
          disabled={!canNavigate || isFirst}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          }
        >
          이전
        </Button>

        <div className="flex-1 text-center text-sm text-neutral-600 dark:text-neutral-400">
          <span className="font-medium">{currentIndex + 1}</span> / <span>{items.length}</span>
        </div>

        <Button
          size="sm"
          variant={canNavigate && !isLast ? 'primary' : 'secondary'}
          onClick={handleNext}
          disabled={!canNavigate || isLast}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          }
        >
          다음
        </Button>
      </div>

      {/* Setlist slider */}
      <div className="overflow-x-auto">
        <div className="flex gap-2 pb-2">
          {items.map((item, index) => (
            <button
              key={`${item.id}-${index}`}
              onClick={() => {
                if (canNavigate) {
                  navigateToSong(index);
                }
              }}
              disabled={!canNavigate}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                index === currentIndex
                  ? 'bg-primary-600 text-white'
                  : canNavigate
                  ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed'
              }`}
            >
              {item.type === 'song'
                ? item.song_form?.name || item.sheet?.title || '(제목 없음)'
                : `[멘트] ${(item.ment_text || '').substring(0, 15)}${(item.ment_text || '').length > 15 ? '...' : ''}`}
            </button>
          ))}
        </div>
      </div>

      {/* Info message for non-creators */}
      {!canNavigate && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
          팀장이 곡을 조작합니다. 자동으로 동기화됩니다.
        </p>
      )}
    </div>
  );
}
