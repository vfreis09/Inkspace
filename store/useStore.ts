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
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  points?: number[];
};

interface CanvasState {
  shapes: Shape[];
  currentTool: Tool;
  isDrawing: boolean;

  setTool: (tool: Tool) => void;
  setIsDrawing: (drawing: boolean) => void;
  addShape: (shape: Omit<Shape, "id">) => void;
  updateShape: (id: string, newProps: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
}

export const useStore = create<CanvasState>((set) => ({
  shapes: [],
  currentTool: "select",
  isDrawing: false,

  setTool: (tool) => set({ currentTool: tool }),
  setIsDrawing: (drawing) => set({ isDrawing: drawing }),

  addShape: (shape) =>
    set((state) => ({
      shapes: [
        ...state.shapes,
        {
          ...shape,
          id: Math.random().toString(36).substr(2, 9),
        },
      ],
    })),

  updateShape: (id, newProps) =>
    set((state) => ({
      shapes: state.shapes.map((s) =>
        s.id === id ? { ...s, ...newProps } : s,
      ),
    })),

  deleteShape: (id) =>
    set((state) => ({
      shapes: state.shapes.filter((s) => s.id !== id),
    })),
}));
