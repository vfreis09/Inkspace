import { create } from "zustand";

export type Shape = {
  id: string;
  type: "rect" | "circle";
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
};

interface CanvasState {
  shapes: Shape[];
  addShape: (type: "rect" | "circle", x: number, y: number) => void;
  updateShape: (id: string, newProps: Partial<Shape>) => void;
}

export const useStore = create<CanvasState>((set) => ({
  shapes: [],

  addShape: (type, x, y) =>
    set((state) => ({
      shapes: [
        ...state.shapes,
        {
          id: Math.random().toString(36).substr(2, 9),
          type,
          x,
          y,
          width: 100,
          height: 100,
          fill: "#6366f1",
        },
      ],
    })),

  updateShape: (id, newProps) =>
    set((state) => ({
      shapes: state.shapes.map((s) =>
        s.id === id ? { ...s, ...newProps } : s,
      ),
    })),
}));
