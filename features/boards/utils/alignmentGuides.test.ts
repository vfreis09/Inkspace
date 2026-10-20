import { describe, it, expect } from "vitest";
import { computeSnap, computeSnapToBounds, getShapeBounds } from "./alignmentGuides";
import type { Shape } from "../store/useStore";

const rect = (id: string, x: number, y: number): Shape =>
  ({
    id, type: "rect", order: 1, x, y, width: 100, height: 100,
    rotation: 0, fill: "#000", stroke: "#000", strokeWidth: 1,
  }) as Shape;

describe("computeSnapToBounds", () => {
  const target = rect("t", 200, 0);

  it("snaps to a nearby edge", () => {
    const dragged = getShapeBounds(rect("d", 203, 500));
    const r = computeSnapToBounds(dragged, [getShapeBounds(target)], 8);
    expect(r.dx).toBe(-3);
    expect(r.guides.vertical).toEqual([200]);
    expect(r.guides.horizontal).toEqual([]);
  });

  it("does nothing outside the threshold", () => {
    const dragged = getShapeBounds(rect("d", 1000, 1000));
    const r = computeSnapToBounds(dragged, [getShapeBounds(target)], 8);
    expect(r.dx).toBe(0);
    expect(r.dy).toBe(0);
    expect(r.guides).toEqual({ vertical: [], horizontal: [] });
  });

  it("matches computeSnap", () => {
    const dragged = getShapeBounds(rect("d", 203, 4));
    expect(computeSnap(dragged, [target], 8)).toEqual(
      computeSnapToBounds(dragged, [getShapeBounds(target)], 8),
    );
  });
});