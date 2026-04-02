import { create } from "zustand";

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

interface CanvasState {
  shapes: Shape[];
  currentTool: Tool;
  isDrawing: boolean;
  selectedIds: string[];
  activeFill: string;
  activeStroke: string;
  activeTarget: "fill" | "stroke";
  brushSize: number;
  isColorPickerOpen: boolean;
  setTool: (tool: Tool) => void;
  setIsDrawing: (drawing: boolean) => void;
  setBrushSize: (size: number) => void;
  setActiveTarget: (target: "fill" | "stroke") => void;
  setTargetColor: (color: string, overrideTarget?: "fill" | "stroke") => void;
  toggleColorPicker: () => void;
  addShape: (shape: Omit<Shape, "id">) => void;
  updateShape: (id: string, newProps: Partial<Shape>) => void;
  deleteShapes: (ids: string[]) => void;
  selectShapes: (ids: string[]) => void;
}

export const useStore = create<CanvasState>((set, get) => ({
  shapes: [],
  currentTool: "select",
  isDrawing: false,
  selectedIds: [],
  activeFill: "#6366f1",
  activeStroke: "#6366f1",
  activeTarget: "fill",
  brushSize: 3,
  isColorPickerOpen: false,
  setTool: (tool) => set({ currentTool: tool }),
  setIsDrawing: (drawing) => set({ isDrawing: drawing }),
  setBrushSize: (size) => set({ brushSize: size }),
  setActiveTarget: (target) => set({ activeTarget: target }),
  toggleColorPicker: () =>
    set((state) => ({ isColorPickerOpen: !state.isColorPickerOpen })),
  setTargetColor: (color: string, overrideTarget?: "fill" | "stroke") => {
    set((state) => {
      const target = overrideTarget || state.activeTarget;
      const update =
        target === "fill" ? { activeFill: color } : { activeStroke: color };
      state.selectedIds.forEach((id) => {
        state.updateShape(id, { [target]: color });
      });
      return update;
    });
  },

  addShape: (shape) =>
    set((state) => ({
      shapes: [
        ...state.shapes,
        { ...shape, id: Math.random().toString(36).slice(2, 11) },
      ],
    })),

  updateShape: (id, newProps) =>
    set((state) => ({
      shapes: state.shapes.map((s) =>
        s.id === id ? { ...s, ...newProps } : s,
      ),
    })),

  deleteShapes: (ids) =>
    set((state) => ({
      shapes: state.shapes.filter((s) => !ids.includes(s.id)),
      selectedIds: state.selectedIds.filter((sid) => !ids.includes(sid)),
    })),

  selectShapes: (ids) => set({ selectedIds: ids }),
}));
