'use client';

import React from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  footer?: React.ReactNode;
}

/**
 * Flutter Scaffold 구조:
 *
 * ┌─────────────────────┐  h-screen
 * │ Header              │  flex-shrink-0
 * ├─────────┬───────────┤
 * │ Sidebar │ content   │  flex-1 overflow-hidden
 * │ (desk)  │ (scroll)  │
 * │         ├───────────┤
 * │         │ footer    │  flex-shrink-0 (저장버튼 등)
 * ├─────────┴───────────┤
 * │ BottomNav (mobile)  │  flex-shrink-0 (normal flow, not fixed)
 * └─────────────────────┘
 */
export const MainLayout: React.FC<MainLayoutProps> = ({ children, title, footer }) => {
  return (
    <div className="flex flex-col h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* AppBar */}
      <Header title={title} />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:w-16 bg-white border-r border-neutral-200">
          <BottomNav />
        </div>

        {/* Main: content (scroll) + footer (sticky) */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            {children}
          </div>
          {footer && (
            <div className="flex-shrink-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700">
              {footer}
            </div>
          )}
        </main>
      </div>

      {/* Mobile BottomNav — normal flow, not fixed */}
      <div className="md:hidden flex-shrink-0">
        <BottomNav />
      </div>
    </div>
  );
};
