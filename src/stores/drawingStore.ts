import { create } from 'zustand';
import { DrawingShape } from '@/types';

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

      return {
        localShapes: newShapes,
        history: newHistory,
        historyIndex: newHistory.length - 1,
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

      return {
        localShapes: [],
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isDirty: true,
      };
    });
  },

  saveToHistory: () => {
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push([...state.localShapes]);

      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
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
