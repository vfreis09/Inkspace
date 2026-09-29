import type { Shape } from "@/features/boards/store/useStore";

export type ReorderMode = "front" | "back" | "forward" | "backward";

type OrderChange = { id: string; oldOrder: number; newOrder: number };

export const compareByOrder = (a: Shape, b: Shape) =>
  a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function computeReorder(
  shapes: Shape[],
  selectedIds: string[],
  mode: ReorderMode,
): OrderChange[] {
  const selected = new Set(selectedIds);
  const isSel = (s: Shape) => selected.has(s.id);
  const sorted = [...shapes].sort(compareByOrder);

  let next: Shape[];
  if (mode === "front") {
    next = [...sorted.filter((s) => !isSel(s)), ...sorted.filter(isSel)];
  } else if (mode === "back") {
    next = [...sorted.filter(isSel), ...sorted.filter((s) => !isSel(s))];
  } else {
    next = [...sorted];
    if (mode === "forward") {
      for (let i = next.length - 2; i >= 0; i--) {
        if (isSel(next[i]) && !isSel(next[i + 1])) {
          [next[i], next[i + 1]] = [next[i + 1], next[i]];
        }
      }
    } else {
      for (let i = 1; i < next.length; i++) {
        if (isSel(next[i]) && !isSel(next[i - 1])) {
          [next[i], next[i - 1]] = [next[i - 1], next[i]];
        }
      }
    }
  }

  // Integer orders: renumber sequentially, only report shapes whose order actually changed.
  return next
    .map((s, i) => ({ id: s.id, oldOrder: s.order, newOrder: i + 1 }))
    .filter((c) => c.oldOrder !== c.newOrder);
}