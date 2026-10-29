import { describe, it, expect } from "vitest";
import {
  computeSnap,
  computeSnapToBounds,
  getShapeBounds,
  getShapesBoundingBox,
} from "./alignmentGuides";
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

  it("snaps correctly at negative coordinates", () => {
    const dragged = {
      left: -97,
      right: -77,
      top: -50,
      bottom: -30,
      centerX: -87,
      centerY: -40,
    };

    const target = {
      left: -100,
      right: -80,
      top: -50,
      bottom: -30,
      centerX: -90,
      centerY: -40,
    };

    const result = computeSnapToBounds(dragged, [target], 5);
    expect(result.dx).toBe(-3);
    expect(result.dy).toBe(0);
    expect(result.guides.vertical).toEqual([-100]);
    expect(result.guides.horizontal).toEqual([-50]);
  });
});


describe("getShapeBounds", () => {
  it("calculates rectangle bounds and center", () => {
    expect(getShapeBounds(rect("a", 10, 20))).toEqual({
      left: 10,
      right: 110,
      top: 20,
      bottom: 120,
      centerX: 60,
      centerY: 70,
    });
  });

  it("calculates line bounds from its points", () => {
    const line = {
      ...rect("line", 100, 50),
      type: "line",
      points: [0, 10, 30, -5, 60, 20],
    } as Shape;

    expect(getShapeBounds(line)).toEqual({
      left: 100,
      right: 160,
      top: 45,
      bottom: 70,
      centerX: 130,
      centerY: 57.5,
    });
  });

  it("estimates text bounds when dimensions are zero", () => {
    const text = {
      ...rect("text", 10, 20),
      type: "text",
      width: 0,
      height: 0,
      text: "Hi",
      fontSize: 10,
    } as Shape;

    expect(getShapeBounds(text)).toEqual({
      left: 10,
      right: 22,
      top: 20,
      bottom: 32,
      centerX: 16,
      centerY: 26,
    });
  });

  it.each(["line", "arrow", "pen"] as const)(
    "handles empty points for %s shapes",
    (type) => {
      const shape = {
        ...rect("empty", 10, 20),
        type,
        points: [],
      } as Shape;

      expect(getShapeBounds(shape)).toEqual({
        left: 10,
        right: 10,
        top: 20,
        bottom: 20,
        centerX: 10,
        centerY: 20,
      });
    },
  );
});

describe("getShapesBoundingBox", () => {
  it("returns null for an empty array", () => {
    expect(getShapesBoundingBox([])).toBeNull();
  });

  it("calculates the combined bounds of multiple shapes", () => {
    const shapes = [
      rect("a", 10, 20),
      {
        ...rect("b", 200, 5),
        width: 50,
        height: 30,
      } as Shape,
    ];

    expect(getShapesBoundingBox(shapes)).toEqual({
      left: 10,
      top: 5,
      right: 250,
      bottom: 120,
      centerX: 0,
      centerY: 0,
    });
  });

  it("combines rectangle and line bounds correctly", () => {
    const shapes = [
      rect("rect", 10, 20),
      {
        ...rect("line", 200, 10),
        type: "line",
        points: [0, 0, 30, 40],
      } as Shape,
    ];

    expect(getShapesBoundingBox(shapes)).toEqual({
      left: 10,
      top: 10,
      right: 230,
      bottom: 120,
      centerX: 0,
      centerY: 0,
    });
  });
});


describe("computeSnap", () => {
  it("snaps to a line shape", () => {
    const dragged = {
      left: 203,
      right: 213,
      top: 20,
      bottom: 30,
      centerX: 208,
      centerY: 25,
    };

    const line = {
      ...rect("line", 200, 0),
      type: "line",
      points: [0, 0, 0, 100],
    } as Shape;

    const result = computeSnap(dragged, [line], 5);

    expect(result.dx).toBe(-3);
    expect(result.guides.vertical).toEqual([200]);
    expect(result.guides.horizontal).toEqual([]);
  });

  it("snaps to a text shape", () => {
    const dragged = {
      left: 203,
      right: 213,
      top: 30,
      bottom: 40,
      centerX: 208,
      centerY: 35,
    };

    const text = {
      ...rect("text", 200, 0),
      type: "text",
      width: 0,
      height: 0,
      text: "Hi",
      fontSize: 10,
    } as Shape;

    const result = computeSnap(dragged, [text], 5);

    expect(result.dx).toBe(-1);
    expect(result.guides.vertical).toEqual([212]);
    expect(result.guides.horizontal).toEqual([]);
  });
});

