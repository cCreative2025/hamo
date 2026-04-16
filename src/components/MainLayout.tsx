'use client';

import React from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  footer?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, title, footer }) => {
  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      <Header title={title} />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:w-16 bg-white border-r border-neutral-200">
          <BottomNav />
        </div>

        {/* Body: scrollable content + optional sticky footer */}
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

      {/* Spacer: fixed BottomNav 높이만큼 공간 확보 (mobile only) */}
      <div className="h-16 flex-shrink-0 md:hidden" />

      {/* Mobile Bottom Navigation (fixed) */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
};
