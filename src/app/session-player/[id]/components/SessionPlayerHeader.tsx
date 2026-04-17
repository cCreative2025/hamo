'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Session, SessionItem } from '@/types';
import { useSessionPlayerStore } from '@/stores/sessionPlayerStore';
import { exportSessionAsPDF } from '@/lib/exportSession';

interface SessionPlayerHeaderProps {
  session: Session;
  currentIndex: number;
  items: SessionItem[];
}

export function SessionPlayerHeader({ session, currentIndex, items }: SessionPlayerHeaderProps) {
  const router = useRouter();
  const { userRole, navigateLocal, isFullscreen, setIsFullscreen, layers, visibleLayers, showBase } = useSessionPlayerStore();
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportSessionAsPDF({
        items,
        layers,
        visibleLayers,
        showBase,
        sessionName: session.name || session.title || '세션',
      });
    } finally {
      setExporting(false);
    }
  }, [items, layers, visibleLayers, session]);

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === items.length - 1;

  const handlePrev = useCallback(() => {
    if (!isFirst) navigateLocal(currentIndex - 1);
  }, [isFirst, currentIndex, navigateLocal]);

  const handleNext = useCallback(() => {
    if (!isLast) navigateLocal(currentIndex + 1);
  }, [isLast, currentIndex, navigateLocal]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [setIsFullscreen]);

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
      {/* Row 1: session name + role + fullscreen + close */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <span className="text-xs text-neutral-400 dark:text-neutral-500 truncate flex-1">
          {session.name || session.title || '세션'}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${roleBadgeColor}`}>
          {roleBadgeText}
        </span>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors flex-shrink-0 disabled:opacity-40"
          aria-label="PDF 내보내기"
          title="PDF 내보내기"
        >
          {exporting ? (
            <svg className="w-4 h-4 text-neutral-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          )}
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors flex-shrink-0"
          aria-label={isFullscreen ? '전체화면 종료' : '전체화면'}
        >
          {isFullscreen ? (
            <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M9 15H4.5M9 15v4.5M9 15l-5.25 5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          )}
        </button>
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
          disabled={isFirst}
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
          disabled={isLast}
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
