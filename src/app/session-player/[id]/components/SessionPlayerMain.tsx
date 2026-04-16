'use client';

import React, { useMemo, useRef, useCallback } from 'react';
import { SessionItem } from '@/types';
import { useSessionPlayerStore } from '@/stores/sessionPlayerStore';
import { SheetRenderer } from './SheetRenderer';
import { MentDisplay } from './MentDisplay';

interface SessionPlayerMainProps {
  currentIndex: number;
  items: SessionItem[];
}

export function SessionPlayerMain({ currentIndex, items }: SessionPlayerMainProps) {
  const { navigateLocal } = useSessionPlayerStore();
  const currentItem = useMemo(() => items[currentIndex], [items, currentIndex]);

  // Swipe detection
  const touchStartX = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 50;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -SWIPE_THRESHOLD) navigateLocal(currentIndex + 1); // swipe left → next
    else if (dx > SWIPE_THRESHOLD) navigateLocal(currentIndex - 1); // swipe right → prev
  }, [currentIndex, navigateLocal]);

  const swipeProps = { onTouchStart, onTouchEnd };

  if (currentItem?.type === 'ment') {
    return <MentDisplay item={currentItem} {...swipeProps} />;
  }

  if (currentItem?.type === 'song') {
    return (
      <div className="flex-1 min-h-0" {...swipeProps}>
        <SheetRenderer currentIndex={currentIndex} item={currentItem} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800" {...swipeProps}>
      <p className="text-neutral-600 dark:text-neutral-400">악보가 없습니다</p>
    </div>
  );
}
