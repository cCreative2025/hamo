'use client';

import React, { useMemo } from 'react';
import { SessionItem } from '@/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SheetRenderer } from './SheetRenderer';
import { MentDisplay } from './MentDisplay';

interface SessionPlayerMainProps {
  currentIndex: number;
  items: SessionItem[];
}

export function SessionPlayerMain({ currentIndex, items }: SessionPlayerMainProps) {
  const currentItem = useMemo(() => items[currentIndex], [items, currentIndex]);

  // If current item is a ment, show it in full-screen mode
  if (currentItem?.type === 'ment') {
    return <MentDisplay item={currentItem} />;
  }

  // Otherwise, show the sheet
  if (currentItem?.type === 'song') {
    return <SheetRenderer currentIndex={currentIndex} item={currentItem} />;
  }

  // Empty state
  return (
    <div className="flex-1 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
      <div className="text-center">
        <p className="text-neutral-600 dark:text-neutral-400">악보가 없습니다</p>
      </div>
    </div>
  );
}
