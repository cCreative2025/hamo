'use client';

import { useEffect } from 'react';

/**
 * iOS PWA에서 뷰포트 핀치줌을 차단하는 전역 컴포넌트.
 * gesturestart/gesturechange는 iOS Safari 전용 이벤트로,
 * preventDefault() 호출 시 WKWebView 레벨의 네이티브 줌을 막는다.
 * (SheetRenderer 내부의 커스텀 핀치줌은 별도 터치 핸들러로 처리)
 */
export function GestureLock() {
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', prevent, { passive: false });
    document.addEventListener('gesturechange', prevent, { passive: false });
    return () => {
      document.removeEventListener('gesturestart', prevent);
      document.removeEventListener('gesturechange', prevent);
    };
  }, []);
  return null;
}
