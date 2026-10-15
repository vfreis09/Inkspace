import { describe, it, expect } from "vitest";
import { isShapeInViewport } from "./viewportCulling";

const vp = { left: 0, top: 0, right: 100, bottom: 100 };

const make = (over: Record<string, unknown> = {}) =>
  ({
    id: "a", type: "rect", order: 1, x: 10, y: 10, width: 20, height: 20,
    rotation: 0, fill: "#000", stroke: "#000", strokeWidth: 3, ...over,
  }) as any;

describe("isShapeInViewport", () => {
  it("keeps a shape fully inside", () => {
    expect(isShapeInViewport(make(), vp)).toBe(true);
  });
  it("culls a shape far outside", () => {
    expect(isShapeInViewport(make({ x: 500, y: 500 }), vp)).toBe(false);
  });
  it("keeps a shape that is half on screen", () => {
    expect(isShapeInViewport(make({ x: 90, y: 10 }), vp)).toBe(true);
  });
  it("respects the padding", () => {
    const s = make({ x: 120, y: 10 });
    expect(isShapeInViewport(s, vp, 0)).toBe(false);
    expect(isShapeInViewport(s, vp, 50)).toBe(true);
  });
  it("keeps a rotated shape that swings into view", () => {
    const r = { x: -100, y: 0, width: 90, height: 90 };
    expect(isShapeInViewport(make({ ...r, rotation: 0 }), vp)).toBe(false);
    expect(isShapeInViewport(make({ ...r, rotation: -45 }), vp)).toBe(true);
  });
  it("uses line points", () => {
    const line = make({ type: "line", x: 200, y: 200, width: 0, height: 0, points: [0, 0, -150, -150] });
    expect(isShapeInViewport(line, vp)).toBe(true);
  });
  it("treats multi-line text as taller than one line", () => {
    const t = make({ type: "text", x: 10, y: -50, width: 0, height: 0, text: "a\nb\nc\nd", fontSize: 20 });
    expect(isShapeInViewport(t, vp)).toBe(true);
  });
});