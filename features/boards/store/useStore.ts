import { create } from "zustand";
import { produce, Draft } from "immer";
import {
  apiCreateShape,
  apiUpdateShape,
  apiDeleteShapes,
  apiFetchShapes,
  apiCreateBoard,
  apiFetchBoards,
} from "@/features/boards/services/boardApi";

export type ShapeType = "rect" | "circle" | "line" | "arrow";
export type Tool = "select" | "rect" | "circle" | "line" | "arrow" | "pan";

export type Shape = {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  points?: number[];
};

type HistorySnapshot = {
  shapes: Shape[];
  currentTool: Tool;
  isDrawing: boolean;
  selectedIds: string[];
  activeFill: string;
  activeStroke: string;
  activeTarget: "fill" | "stroke";
  brushSize: number;
  isColorPickerOpen: boolean;
};

interface CanvasState {
  currentBoardId: string | null;
  isBoardLoading: boolean;
  boardError: string | null;
  shapes: Shape[];
  currentTool: Tool;
  isDrawing: boolean;
  selectedIds: string[];
  activeFill: string;
  activeStroke: string;
  activeTarget: "fill" | "stroke";
  brushSize: number;
  isColorPickerOpen: boolean;
  history: {
    past: HistorySnapshot[];
    future: HistorySnapshot[];
  };
  canUndo: boolean;
  canRedo: boolean;
  initBoard: () => Promise<void>;
  loadBoard: (boardId: string) => Promise<void>;
  setTool: (tool: Tool) => void;
  setIsDrawing: (drawing: boolean) => void;
  setBrushSize: (size: number) => void;
  setActiveTarget: (target: "fill" | "stroke") => void;
  setTargetColor: (color: string, overrideTarget?: "fill" | "stroke") => void;
  toggleColorPicker: () => void;
  addShape: (shape: Omit<Shape, "id">) => Promise<void>;
  updateShape: (id: string, newProps: Partial<Shape>) => Promise<void>;
  deleteShapes: (ids: string[]) => Promise<void>;
  selectShapes: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
}

const snapshotFromState = (state: CanvasState): HistorySnapshot => ({
  shapes: state.shapes,
  currentTool: state.currentTool,
  isDrawing: state.isDrawing,
  selectedIds: state.selectedIds,
  activeFill: state.activeFill,
  activeStroke: state.activeStroke,
  activeTarget: state.activeTarget,
  brushSize: state.brushSize,
  isColorPickerOpen: state.isColorPickerOpen,
});

export const useStore = create<CanvasState>((set, get) => ({
  currentBoardId: null,
  isBoardLoading: false,
  boardError: null,
  shapes: [],
  currentTool: "select",
  isDrawing: false,
  selectedIds: [],
  activeFill: "#6366f1",
  activeStroke: "#6366f1",
  activeTarget: "fill",
  brushSize: 3,
  isColorPickerOpen: false,
  history: { past: [], future: [] },
  canUndo: false,
  canRedo: false,

  initBoard: async () => {
    set({ isBoardLoading: true, boardError: null });
    try {
      const boards = await apiFetchBoards();
      if (boards.length > 0) {
        await get().loadBoard(boards[0].id);
      } else {
        const board = await apiCreateBoard("My Board");
        await get().loadBoard(board.id);
      }
    } catch {
      set({ boardError: "Failed to load board. Is the server running?" });
    } finally {
      set({ isBoardLoading: false });
    }
  },

  loadBoard: async (boardId: string) => {
    set({ isBoardLoading: true, boardError: null, currentBoardId: boardId });
    try {
      const shapes = await apiFetchShapes(boardId);
      set({
        shapes,
        history: { past: [], future: [] },
        canUndo: false,
        canRedo: false,
      });
    } catch {
      set({ boardError: "Failed to load shapes." });
    } finally {
      set({ isBoardLoading: false });
    }
  },

  setTool: (tool) => {
    const prev = snapshotFromState(get());
    set((state) => ({
      ...state,
      history: { past: [...state.history.past, prev], future: [] },
      canUndo: true,
      canRedo: false,
      currentTool: tool,
    }));
  },

  setIsDrawing: (drawing) => set({ isDrawing: drawing }),

  setBrushSize: (size) => {
    const prev = snapshotFromState(get());
    set((state) => ({
      ...state,
      history: { past: [...state.history.past, prev], future: [] },
      canUndo: true,
      canRedo: false,
      brushSize: size,
    }));
  },

  setActiveTarget: (target) => set({ activeTarget: target }),

  setTargetColor: (color, overrideTarget) => {
    const prev = snapshotFromState(get());
    set((state) => {
      const draft = produce(state, (d: Draft<CanvasState>) => {
        const target = overrideTarget || d.activeTarget;
        if (target === "fill") d.activeFill = color;
        else d.activeStroke = color;
        d.selectedIds.forEach((id) => {
          const shape = d.shapes.find((s) => s.id === id);
          if (shape) shape[target] = color;
        });
      });
      return {
        ...draft,
        history: { past: [...state.history.past, prev], future: [] },
        canUndo: true,
        canRedo: false,
      };
    });
  },

  toggleColorPicker: () =>
    set((state) => ({ isColorPickerOpen: !state.isColorPickerOpen })),

  addShape: async (shape) => {
    const prev = snapshotFromState(get());
    const tempId = Math.random().toString(36).slice(2, 11);

    set((state) => {
      const draft = produce(state, (d: Draft<CanvasState>) => {
        d.shapes.push({ ...shape, id: tempId });
      });
      return {
        ...draft,
        history: { past: [...state.history.past, prev], future: [] },
        canUndo: true,
        canRedo: false,
      };
    });

    const { currentBoardId } = get();
    if (currentBoardId) {
      try {
        const saved = await apiCreateShape(currentBoardId, shape);
        set((state) => ({
          shapes: state.shapes.map((s) =>
            s.id === tempId ? { ...s, id: saved.id } : s,
          ),
        }));
      } catch {
        console.error("Failed to save shape — rolling back");
        set((state) => ({
          shapes: state.shapes.filter((s) => s.id !== tempId),
        }));
      }
    }
  },

  updateShape: async (id, newProps) => {
    const prev = snapshotFromState(get());

    set((state) => {
      const draft = produce(state, (d: Draft<CanvasState>) => {
        const shape = d.shapes.find((s) => s.id === id);
        if (shape) Object.assign(shape, newProps);
      });
      return {
        ...draft,
        history: { past: [...state.history.past, prev], future: [] },
        canUndo: true,
        canRedo: false,
      };
    });

    const { currentBoardId } = get();
    if (currentBoardId) {
      try {
        await apiUpdateShape(currentBoardId, id, newProps);
      } catch {
        console.error("Failed to update shape");
      }
    }
  },

  deleteShapes: async (ids) => {
    const prev = snapshotFromState(get());

    set((state) => {
      const draft = produce(state, (d: Draft<CanvasState>) => {
        d.shapes = d.shapes.filter((s) => !ids.includes(s.id));
        d.selectedIds = d.selectedIds.filter((sid) => !ids.includes(sid));
      });
      return {
        ...draft,
        history: { past: [...state.history.past, prev], future: [] },
        canUndo: true,
        canRedo: false,
      };
    });

    const { currentBoardId } = get();
    if (currentBoardId) {
      try {
        await apiDeleteShapes(currentBoardId, ids);
      } catch {
        console.error("Failed to delete shapes");
      }
    }
  },

  selectShapes: (ids) => set((state) => ({ ...state, selectedIds: ids })),

  undo: () => {
    set((state) => {
      if (state.history.past.length === 0) return state;
      const previous = state.history.past[state.history.past.length - 1];
      const current = snapshotFromState(state);
      return {
        ...state,
        shapes: previous.shapes,
        currentTool: previous.currentTool,
        isDrawing: previous.isDrawing,
        selectedIds: previous.selectedIds,
        activeFill: previous.activeFill,
        activeStroke: previous.activeStroke,
        activeTarget: previous.activeTarget,
        brushSize: previous.brushSize,
        isColorPickerOpen: previous.isColorPickerOpen,
        history: {
          past: state.history.past.slice(0, -1),
          future: [current, ...state.history.future],
        },
        canUndo: state.history.past.length - 1 > 0,
        canRedo: true,
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.history.future.length === 0) return state;
      const next = state.history.future[0];
      const current = snapshotFromState(state);
      return {
        ...state,
        shapes: next.shapes,
        currentTool: next.currentTool,
        isDrawing: next.isDrawing,
        selectedIds: next.selectedIds,
        activeFill: next.activeFill,
        activeStroke: next.activeStroke,
        activeTarget: next.activeTarget,
        brushSize: next.brushSize,
        isColorPickerOpen: next.isColorPickerOpen,
        history: {
          past: [...state.history.past, current],
          future: state.history.future.slice(1),
        },
        canUndo: true,
        canRedo: state.history.future.length - 1 > 0,
      };
    });
  },
}));
