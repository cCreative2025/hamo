'use client';

import React, { useMemo, useRef, useCallback, useState } from 'react';
import { SessionItem } from '@/types';
import { useSessionPlayerStore } from '@/stores/sessionPlayerStore';
import { SheetRenderer } from './SheetRenderer';
import { MentDisplay } from './MentDisplay';

interface SessionPlayerMainProps {
  currentIndex: number;
  items: SessionItem[];
}

export function SessionPlayerMain({ currentIndex, items }: SessionPlayerMainProps) {
  const { navigateLocal, isFullscreen, setIsFullscreen } = useSessionPlayerStore();
  const currentItem = useMemo(() => items[currentIndex], [items, currentIndex]);
  const [showNav, setShowNav] = useState(false);

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === items.length - 1;

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
    if (dx < -SWIPE_THRESHOLD) navigateLocal(currentIndex + 1);
    else if (dx > SWIPE_THRESHOLD) navigateLocal(currentIndex - 1);
  }, [currentIndex, navigateLocal]);

  const exitFullscreen = useCallback(() => {
    document.exitFullscreen().catch(() => {});
    setIsFullscreen(false);
  }, [setIsFullscreen]);

  const navOverlay = (
    <>
      {/* Left arrow */}
      <button
        onClick={() => navigateLocal(currentIndex - 1)}
        disabled={isFirst}
        className={`absolute left-0 top-0 h-full w-16 flex items-center justify-start pl-2 transition-opacity duration-150 ${
          showNav && !isFirst ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </div>
      </button>

      {/* Right arrow */}
      <button
        onClick={() => navigateLocal(currentIndex + 1)}
        disabled={isLast}
        className={`absolute right-0 top-0 h-full w-16 flex items-center justify-end pr-2 transition-opacity duration-150 ${
          showNav && !isLast ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* Fullscreen exit button */}
      {isFullscreen && (
        <button
          onClick={exitFullscreen}
          className={`absolute bottom-4 right-4 transition-opacity duration-150 ${
            showNav ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M9 15H4.5M9 15v4.5M9 15l-5.25 5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
            </svg>
          </div>
        </button>
      )}
    </>
  );

  const wrapperProps = {
    onMouseEnter: () => setShowNav(true),
    onMouseLeave: () => setShowNav(false),
    onTouchStart,
    onTouchEnd,
  };

  if (currentItem?.type === 'ment') {
    return (
      <div className="flex-1 min-h-0 relative" {...wrapperProps}>
        <MentDisplay item={currentItem} />
        {navOverlay}
      </div>
    );
  }

  if (currentItem?.type === 'song') {
    return (
      <div className="flex-1 min-h-0 relative" {...wrapperProps}>
        <SheetRenderer currentIndex={currentIndex} item={currentItem} />
        {navOverlay}
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 relative" {...wrapperProps}>
      <p className="text-neutral-600 dark:text-neutral-400">악보가 없습니다</p>
      {navOverlay}
    </div>
  );
}
