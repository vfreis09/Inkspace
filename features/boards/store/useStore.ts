import { create } from "zustand";
import { produce, Draft } from "immer";
import { apiFetchShapes } from "@/features/boards/services/boardApi";

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

export type Action =
  | { type: "ADD"; shape: Shape }
  | {
      type: "UPDATE";
      id: string;
      oldProps: Partial<Shape>;
      newProps: Partial<Shape>;
    }
  | {
      type: "UPDATE_BATCH";
      updates: {
        id: string;
        oldProps: Partial<Shape>;
        newProps: Partial<Shape>;
      }[];
    }
  | { type: "DELETE"; shapes: Shape[] };

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
  history: { past: Action[]; future: Action[] };
  canUndo: boolean;
  canRedo: boolean;

  broadcast: ((action: Action) => void) | null;
  setBroadcast: (fn: ((action: Action) => void) | null) => void;

  loadBoard: (boardId: string) => Promise<void>;
  setTool: (tool: Tool) => void;
  setIsDrawing: (drawing: boolean) => void;
  setBrushSize: (size: number) => void;
  setActiveTarget: (target: "fill" | "stroke") => void;
  setTargetColor: (color: string, overrideTarget?: "fill" | "stroke") => void;
  toggleColorPicker: () => void;

  addShapeLocally: (shape: Shape) => void;
  updateShapeLocally: (
    id: string,
    props: Partial<Shape>,
    addToHistory?: boolean,
  ) => void;
  deleteShapesLocally: (ids: string[]) => void;
  selectShapes: (ids: string[]) => void;

  undo: () => Action | null;
  redo: () => Action | null;

  addShapeFromRemote: (shape: Shape) => void;
  updateShapeFromRemote: (id: string, props: Partial<Shape>) => void;
  deleteShapesFromRemote: (ids: string[]) => void;
  replaceShapesFromRemote: (shapes: Shape[]) => void;
}

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

  broadcast: null,
  setBroadcast: (fn) => set({ broadcast: fn }),

  loadBoard: async (boardId: string) => {
    set({ isBoardLoading: true, boardError: null });
    try {
      const grants = JSON.parse(localStorage.getItem("board_grants") || "{}");
      const token = grants[boardId];
      const shapes = await apiFetchShapes(boardId, token);
      set({
        shapes,
        currentBoardId: boardId,
        history: { past: [], future: [] },
        canUndo: false,
        canRedo: false,
        isBoardLoading: false,
      });
    } catch (err: any) {
      const message =
        err?.message === "FORBIDDEN"
          ? "This board is private. Use an invite link."
          : err?.message === "NOT_FOUND"
            ? "Board not found."
            : err?.message === "Failed to fetch shapes"
              ? "Failed to load board."
              : err?.message || "Failed to load board";
      set({ boardError: message, isBoardLoading: false });
    }
  },

  setTool: (tool) => set({ currentTool: tool }),
  setIsDrawing: (drawing) => set({ isDrawing: drawing }),
  setBrushSize: (size) => set({ brushSize: size }),
  setActiveTarget: (target) => set({ activeTarget: target }),

  setTargetColor: (color, overrideTarget) => {
    const target = overrideTarget ?? get().activeTarget;
    const { selectedIds, shapes, history } = get();

    const updates = selectedIds
      .map((id) => {
        const s = shapes.find((sh) => sh.id === id);
        return {
          id,
          oldProps: { [target]: target === "fill" ? s?.fill : s?.stroke },
          newProps: { [target]: color },
        };
      })
      .filter((u) => u.oldProps[target] !== u.newProps[target]);

    if (updates.length === 0) {
      set((state) => ({
        activeFill: target === "fill" ? color : state.activeFill,
        activeStroke: target === "stroke" ? color : state.activeStroke,
      }));
      return;
    }

    let finalAction: Action;

    set((state) => {
      const past = state.history.past;
      const lastAction = past[past.length - 1];

      const isSameBatch =
        lastAction?.type === "UPDATE_BATCH" &&
        lastAction.updates.length === updates.length &&
        lastAction.updates.every(
          (u, i) =>
            u.id === updates[i].id && Object.keys(u.newProps)[0] === target,
        );

      if (isSameBatch) {
        const coalescedUpdates = updates.map((u, i) => ({
          ...u,
          oldProps: lastAction.updates[i].oldProps,
        }));
        finalAction = { type: "UPDATE_BATCH", updates: coalescedUpdates };

        return {
          ...produce(state, (d: Draft<CanvasState>) => {
            if (target === "fill") d.activeFill = color;
            else d.activeStroke = color;
            d.selectedIds.forEach((id) => {
              const shape = d.shapes.find((s) => s.id === id);
              if (shape) {
                if (target === "fill") shape.fill = color;
                else shape.stroke = color;
              }
            });
          }),
          history: { past: [...past.slice(0, -1), finalAction], future: [] },
          canUndo: true,
          canRedo: false,
        };
      } else {
        finalAction = { type: "UPDATE_BATCH", updates };

        return {
          ...produce(state, (d: Draft<CanvasState>) => {
            if (target === "fill") d.activeFill = color;
            else d.activeStroke = color;
            d.selectedIds.forEach((id) => {
              const shape = d.shapes.find((s) => s.id === id);
              if (shape) {
                if (target === "fill") shape.fill = color;
                else shape.stroke = color;
              }
            });
          }),
          history: { past: [...past, finalAction], future: [] },
          canUndo: true,
          canRedo: false,
        };
      }
    });

    get().broadcast?.(finalAction!);
  },

  toggleColorPicker: () =>
    set((state) => ({ isColorPickerOpen: !state.isColorPickerOpen })),

  addShapeLocally: (shape) => {
    const action: Action = { type: "ADD", shape };
    set((state) => ({
      shapes: [...state.shapes, shape],
      history: { past: [...state.history.past, action], future: [] },
      canUndo: true,
      canRedo: false,
    }));
  },

  updateShapeLocally: (id, props, addToHistory = true) => {
    set((state) => {
      const original = state.shapes.find((s) => s.id === id);
      if (!original) return state;

      const newShapes = state.shapes.map((s) =>
        s.id === id ? { ...s, ...props } : s,
      );

      if (!addToHistory) return { shapes: newShapes };

      const oldProps = Object.keys(props).reduce(
        (acc, key) => ({
          ...acc,
          [key]: (original as any)[key],
        }),
        {},
      );

      const action: Action = { type: "UPDATE", id, oldProps, newProps: props };

      return {
        shapes: newShapes,
        history: { past: [...state.history.past, action], future: [] },
        canUndo: true,
        canRedo: false,
      };
    });
  },

  deleteShapesLocally: (ids) => {
    const { shapes } = get();
    const deletedShapes = shapes.filter((s) => ids.includes(s.id));
    const action: Action = { type: "DELETE", shapes: deletedShapes };

    set((state) => ({
      shapes: state.shapes.filter((s) => !ids.includes(s.id)),
      selectedIds: state.selectedIds.filter((id) => !ids.includes(id)),
      history: { past: [...state.history.past, action], future: [] },
      canUndo: true,
      canRedo: false,
    }));
  },

  selectShapes: (ids) => set({ selectedIds: ids }),

  undo: () => {
    const { history } = get();
    if (history.past.length === 0) return null;

    const action = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);

    set((state) => {
      let newShapes = [...state.shapes];

      switch (action.type) {
        case "ADD":
          newShapes = newShapes.filter((s) => s.id !== action.shape.id);
          break;
        case "DELETE":
          newShapes = [...newShapes, ...action.shapes];
          break;
        case "UPDATE":
          newShapes = newShapes.map((s) =>
            s.id === action.id ? { ...s, ...action.oldProps } : s,
          );
          break;
        case "UPDATE_BATCH":
          action.updates.forEach((u) => {
            newShapes = newShapes.map((s) =>
              s.id === u.id ? { ...s, ...u.oldProps } : s,
            );
          });
          break;
      }

      return {
        shapes: newShapes,
        history: { past: newPast, future: [action, ...state.history.future] },
        canUndo: newPast.length > 0,
        canRedo: true,
      };
    });
    return action;
  },

  redo: () => {
    const { history } = get();
    if (history.future.length === 0) return null;

    const action = history.future[0];
    const newFuture = history.future.slice(1);

    set((state) => {
      let newShapes = [...state.shapes];

      switch (action.type) {
        case "ADD":
          newShapes = [...newShapes, action.shape];
          break;
        case "DELETE":
          const idsToRemove = action.shapes.map((s) => s.id);
          newShapes = newShapes.filter((s) => !idsToRemove.includes(s.id));
          break;
        case "UPDATE":
          newShapes = newShapes.map((s) =>
            s.id === action.id ? { ...s, ...action.newProps } : s,
          );
          break;
        case "UPDATE_BATCH":
          action.updates.forEach((u) => {
            newShapes = newShapes.map((s) =>
              s.id === u.id ? { ...s, ...u.newProps } : s,
            );
          });
          break;
      }

      return {
        shapes: newShapes,
        history: { past: [...state.history.past, action], future: newFuture },
        canUndo: true,
        canRedo: newFuture.length > 0,
      };
    });
    return action;
  },

  addShapeFromRemote: (shape) =>
    set((s) =>
      s.shapes.some((x) => x.id === shape.id)
        ? s
        : { shapes: [...s.shapes, shape] },
    ),
  updateShapeFromRemote: (id, props) =>
    set((s) => ({
      shapes: s.shapes.map((x) => (x.id === id ? { ...x, ...props } : x)),
    })),
  deleteShapesFromRemote: (ids) =>
    set((s) => ({
      shapes: s.shapes.filter((x) => !ids.includes(x.id)),
      selectedIds: s.selectedIds.filter((x) => !ids.includes(x)),
    })),
  replaceShapesFromRemote: (shapes) => set({ shapes }),
}));
