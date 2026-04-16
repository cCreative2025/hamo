'use client';

import React from 'react';
import { SessionItem } from '@/types';
import { useSessionPlayerStore } from '@/stores/sessionPlayerStore';

interface SessionPlayerFooterProps {
  items: SessionItem[];
  currentIndex: number;
}

export function SessionPlayerFooter({ items, currentIndex }: SessionPlayerFooterProps) {
  const { navigateLocal } = useSessionPlayerStore();

  return (
    <div className="flex-shrink-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 px-3 py-2">
      <div className="overflow-x-auto">
        <div className="flex gap-1.5 pb-0.5">
          {items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => navigateLocal(index)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                index === currentIndex
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {index + 1}.{' '}
              {item.type === 'song'
                ? item.song_form?.name || item.sheet?.title || '(제목 없음)'
                : `멘트`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
