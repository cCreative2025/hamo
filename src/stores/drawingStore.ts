import { create } from 'zustand';
import { DrawingShape } from '@/types';

const MAX_HISTORY = 100;

function cap(history: DrawingShape[][], historyIndex: number): { history: DrawingShape[][]; historyIndex: number } {
  if (history.length <= MAX_HISTORY) return { history, historyIndex };
  const drop = history.length - MAX_HISTORY;
  return {
    history: history.slice(drop),
    historyIndex: Math.max(0, historyIndex - drop),
  };
}

interface DrawingStore {
  selectedTool: 'pen' | 'eraser' | 'highlighter';
  brushColor: string;
  brushSize: number;
  localShapes: DrawingShape[];
  history: DrawingShape[][];
  historyIndex: number;
  isDirty: boolean;

  // Actions
  setSelectedTool: (tool: 'pen' | 'eraser' | 'highlighter') => void;
  setBrushColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setLocalShapes: (shapes: DrawingShape[]) => void;
  addShape: (shape: DrawingShape) => void;
  undo: () => void;
  redo: () => void;
  clearLocalShapes: () => void;
  saveToHistory: () => void;
  resetHistory: () => void;
}

export const useDrawingStore = create<DrawingStore>((set) => ({
  selectedTool: 'pen',
  brushColor: '#000000',
  brushSize: 3,
  localShapes: [],
  history: [[]],
  historyIndex: 0,
  isDirty: false,

  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setBrushColor: (color) => set({ brushColor: color }),
  setBrushSize: (size) => set({ brushSize: size }),

  setLocalShapes: (shapes) => {
    set({ localShapes: shapes, isDirty: true });
  },

  addShape: (shape) => {
    set((state) => {
      const newShapes = [...state.localShapes, shape];
      // Trim future history if we're not at the end
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newShapes);

      const capped = cap(newHistory, newHistory.length - 1);
      return {
        localShapes: newShapes,
        history: capped.history,
        historyIndex: capped.historyIndex,
        isDirty: true,
      };
    });
  },

  undo: () => {
    set((state) => {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        return {
          localShapes: state.history[newIndex],
          historyIndex: newIndex,
          isDirty: true,
        };
      }
      return state;
    });
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        return {
          localShapes: state.history[newIndex],
          historyIndex: newIndex,
          isDirty: true,
        };
      }
      return state;
    });
  },

  clearLocalShapes: () => {
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push([]);

      const capped = cap(newHistory, newHistory.length - 1);
      return {
        localShapes: [],
        history: capped.history,
        historyIndex: capped.historyIndex,
        isDirty: true,
      };
    });
  },

  saveToHistory: () => {
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push([...state.localShapes]);

      const capped = cap(newHistory, newHistory.length - 1);
      return {
        history: capped.history,
        historyIndex: capped.historyIndex,
        isDirty: false,
      };
    });
  },

  resetHistory: () => {
    set({
      localShapes: [],
      history: [[]],
      historyIndex: 0,
      isDirty: false,
    });
  },
}));
