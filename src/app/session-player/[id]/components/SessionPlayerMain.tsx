'use client';

import React, { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { SessionItem } from '@/types';
import { useSessionPlayerStore } from '@/stores/sessionPlayerStore';
import { SheetRenderer } from './SheetRenderer';
import { MentDisplay } from './MentDisplay';

interface SessionPlayerMainProps {
  currentIndex: number;
  items: SessionItem[];
}

// ── 단일 슬롯 렌더러 ──────────────────────────────────────────────────────────
function ItemSlot({ item, navProps }: { item: SessionItem | null; navProps?: NavProps }) {
  if (!item) {
    // 엣지 슬롯 (첫/마지막 페이지 밖)
    return <div className="w-full h-full bg-neutral-200 dark:bg-neutral-800" />;
  }
  if (item.type === 'ment') {
    return <MentDisplay item={item} />;
  }
  return <SheetRenderer item={item} currentIndex={0} navProps={navProps} />;
}

// ── SessionPlayerMain ─────────────────────────────────────────────────────────
export function SessionPlayerMain({ currentIndex, items }: SessionPlayerMainProps) {
  const { navigateLocal, isFullscreen, setIsFullscreen } = useSessionPlayerStore();
  const [showNav, setShowNav] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);

  // 스태일 클로저 방지용 refs
  const currentIndexRef = useRef(currentIndex);
  const isFirstRef = useRef(false);
  const isLastRef = useRef(false);
  const navigateRef = useRef(navigateLocal);
  const navigatingRef = useRef(false); // 애니메이션 중 중복 방지

  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { isFirstRef.current = currentIndex === 0; }, [currentIndex]);
  useEffect(() => { isLastRef.current = currentIndex === items.length - 1; }, [currentIndex, items.length]);
  useEffect(() => { navigateRef.current = navigateLocal; }, [navigateLocal]);

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === items.length - 1;

  const prevItem = items[currentIndex - 1] ?? null;
  const currentItem = items[currentIndex];
  const nextItem = items[currentIndex + 1] ?? null;

  // ── 슬라이드 transform 적용 ──────────────────────────────────────────────────
  const applyTransform = useCallback((offsetPx: number, animated: boolean) => {
    const el = slideRef.current;
    if (!el) return;
    el.style.transition = animated
      ? 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      : 'none';
    el.style.transform = `translateX(calc(-33.3333% + ${offsetPx}px))`;
  }, []);

  // currentIndex 변경(네비게이션 완료) 시 즉시 center 위치로 복귀
  useEffect(() => {
    applyTransform(0, false);
  }, [currentIndex, applyTransform]);

  // ── 터치 드래그 핸들러 (native — passive: true, 60fps) ─────────────────────
  const dragging = useRef(false);
  const startTouchX = useRef(0);
  const startTouchY = useRef(0);
  const lastDragX = useRef(0);
  const dragDir = useRef<'h' | 'v' | null>(null); // h=수평(캐러셀), v=수직(통과)

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || navigatingRef.current) return;
      dragging.current = true;
      startTouchX.current = e.touches[0].clientX;
      startTouchY.current = e.touches[0].clientY;
      lastDragX.current = 0;
      dragDir.current = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current || e.touches.length !== 1) return;
      const rawX = e.touches[0].clientX - startTouchX.current;
      const rawY = e.touches[0].clientY - startTouchY.current;

      // 첫 5px 이후 방향 결정 (수평 or 수직)
      if (dragDir.current === null && (Math.abs(rawX) > 5 || Math.abs(rawY) > 5)) {
        dragDir.current = Math.abs(rawX) >= Math.abs(rawY) ? 'h' : 'v';
      }
      if (dragDir.current !== 'h') return; // 수직 드래그 → 캐러셀 무시

      e.preventDefault(); // iOS가 터치 제스처를 가로채지 못하게 차단

      // 엣지에서 rubber-band (인접 페이지 없을 때)
      let dx = rawX;
      if (rawX > 0 && isFirstRef.current) dx = Math.min(rawX * 0.25, 50);
      if (rawX < 0 && isLastRef.current) dx = Math.max(rawX * 0.25, -50);
      lastDragX.current = dx;
      applyTransform(dx, false);
    };

    const onTouchEnd = () => {
      if (!dragging.current) return;
      dragging.current = false;
      const dir = dragDir.current;
      dragDir.current = null;
      if (dir !== 'h') return; // 수직이었으면 아무것도 안 함

      const dx = lastDragX.current;
      const w = container.offsetWidth;
      const THRESHOLD = w * 0.22; // 22% of screen width

      if (dx < -THRESHOLD && !isLastRef.current) {
        navigatingRef.current = true;
        applyTransform(-w, true);
        setTimeout(() => {
          navigateRef.current(currentIndexRef.current + 1);
          navigatingRef.current = false;
        }, 280);
      } else if (dx > THRESHOLD && !isFirstRef.current) {
        navigatingRef.current = true;
        applyTransform(w, true);
        setTimeout(() => {
          navigateRef.current(currentIndexRef.current - 1);
          navigatingRef.current = false;
        }, 280);
      } else {
        applyTransform(0, true); // snap back
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false }); // iOS 제스처 차단 위해 passive: false
    container.addEventListener('touchend', onTouchEnd);
    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [applyTransform]);

  // ── 화살표 버튼 애니메이션 네비게이션 ───────────────────────────────────────
  const navigateWithAnim = useCallback((direction: 'prev' | 'next') => {
    if (navigatingRef.current) return;
    const w = containerRef.current?.offsetWidth ?? 0;
    navigatingRef.current = true;
    applyTransform(direction === 'next' ? -w : w, true);
    setTimeout(() => {
      navigateRef.current(currentIndexRef.current + (direction === 'next' ? 1 : -1));
      navigatingRef.current = false;
    }, 280);
  }, [applyTransform]);

  const exitFullscreen = useCallback(() => {
    document.exitFullscreen().catch(() => {});
    setIsFullscreen(false);
  }, [setIsFullscreen]);

  const navProps: NavProps = {
    showNav,
    isFirst,
    isLast,
    isFullscreen,
    onPrev: () => navigateWithAnim('prev'),
    onNext: () => navigateWithAnim('next'),
    onExitFullscreen: exitFullscreen,
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 relative overflow-hidden"
      style={{ touchAction: 'pan-y' }}
      onMouseEnter={() => setShowNav(true)}
      onMouseLeave={() => setShowNav(false)}
    >
      {/* 3-슬롯 슬라이딩 스트립 (300% 너비, 평상시 center 슬롯 표시) */}
      <div
        ref={slideRef}
        className="flex h-full"
        style={{
          width: '300%',
          transform: 'translateX(-33.3333%)',
          willChange: 'transform',
        }}
      >
        {/* 슬롯 1: 이전 페이지 */}
        <div className="h-full flex-shrink-0" style={{ width: '33.3333%' }}>
          <ItemSlot key={prevItem?.id ?? '__prev-empty'} item={prevItem} />
        </div>

        {/* 슬롯 2: 현재 페이지 */}
        <div className="h-full flex-shrink-0" style={{ width: '33.3333%' }}>
          <ItemSlot key={currentItem?.id} item={currentItem} navProps={navProps} />
        </div>

        {/* 슬롯 3: 다음 페이지 */}
        <div className="h-full flex-shrink-0" style={{ width: '33.3333%' }}>
          <ItemSlot key={nextItem?.id ?? '__next-empty'} item={nextItem} />
        </div>
      </div>
    </div>
  );
}

// ── 재사용 NavOverlay ─────────────────────────────────────────────────────────
export interface NavProps {
  showNav: boolean;
  isFirst: boolean;
  isLast: boolean;
  isFullscreen: boolean;
  onPrev: () => void;
  onNext: () => void;
  onExitFullscreen: () => void;
}

export function NavOverlay({ showNav, isFirst, isLast, isFullscreen, onPrev, onNext, onExitFullscreen }: NavProps) {
  return (
    <>
      <button
        onClick={onPrev}
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

      <button
        onClick={onNext}
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

      {isFullscreen && (
        <button
          onClick={onExitFullscreen}
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
}
