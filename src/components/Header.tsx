'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Button } from './Button';

interface HeaderProps {
  title?: string;
  showUserMenu?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showUserMenu = true }) => {
  const router = useRouter();
  const { currentUser, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-primary-600">Hamo</h1>
          {title && <h2 className="text-lg font-semibold text-neutral-700">{title}</h2>}
        </div>

        {/* User Menu */}
        {showUserMenu && currentUser && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-600">
                  {currentUser.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-neutral-900">{currentUser.name}</p>
                <p className="text-xs text-neutral-500">{currentUser.email}</p>
              </div>
              <svg
                className={`w-4 h-4 text-neutral-500 transition-transform ${
                  menuOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-200">
                  <p className="text-sm font-medium text-neutral-900">{currentUser.name}</p>
                  <p className="text-xs text-neutral-500">{currentUser.email}</p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push('/profile');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  프로필
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push('/settings');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  설정
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-neutral-200"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
