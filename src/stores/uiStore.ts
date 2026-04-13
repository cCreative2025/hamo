import { create } from 'zustand';
import { UIState } from '@/types';

interface UIStoreExtended extends UIState {
  openModal: (key: string) => void;
  closeModal: (key: string) => void;
  closeAllModals: () => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setActiveTab: (tab: 'sheets' | 'sessions' | 'teams') => void;
}

export const useUIStore = create<UIStoreExtended>((set) => ({
  theme: 'light',
  activeTab: 'sheets',
  sidebarOpen: true,
  modals: {},

  openModal: (key: string) => {
    set((state) => ({
      modals: {
        ...state.modals,
        [key]: true,
      },
    }));
  },

  closeModal: (key: string) => {
    set((state) => ({
      modals: {
        ...state.modals,
        [key]: false,
      },
    }));
  },

  closeAllModals: () => {
    set((state) => {
      const newModals: Record<string, boolean> = {};
      Object.keys(state.modals).forEach((key) => {
        newModals[key] = false;
      });
      return { modals: newModals };
    });
  },

  toggleSidebar: () => {
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    }));
  },

  setTheme: (theme: 'light' | 'dark') => {
    set({ theme });
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
  },

  setActiveTab: (tab: 'sheets' | 'sessions' | 'teams') => {
    set({ activeTab: tab });
  },
}));
