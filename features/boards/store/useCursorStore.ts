import { create } from "zustand";
import type { RemoteCursor } from "@/features/boards/hooks/usePartyKit";

type CursorState = {
  cursors: RemoteCursor[];
  setCursors: (cursors: RemoteCursor[]) => void;
};

export const useCursorStore = create<CursorState>((set) => ({
  cursors: [],
  setCursors: (cursors) => set({ cursors }),
}));