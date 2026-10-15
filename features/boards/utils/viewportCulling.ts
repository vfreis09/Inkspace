import type { Shape } from "@/features/boards/store/useStore";
import { getShapeBounds } from "./alignmentGuides";

export type Viewport = { left: number; top: number; right: number; bottom: number };

type Box = { left: number; top: number; right: number; bottom: number };

// Shapes are replaced (never mutated) on edit, so a WeakMap cache is safe.
const boxCache = new WeakMap<Shape, Box>();

function computeBox(shape: Shape): Box {
  let b = getShapeBounds(shape);
  let { left, right, top, bottom } = b;

  if (shape.type === "text") {
    // getShapeBounds ignores multi-line text, so use a generous estimate
    const lines = (shape.text ?? "").split("\n");
    const fs = shape.fontSize ?? 20;
    const w = Math.max(...lines.map((l) => l.length), 1) * fs;
    const h = lines.length * fs * 1.5;
    left = shape.x;
    top = shape.y;
    right = left + w;
    bottom = top + h;
  }

  if (shape.rotation) {
    // Konva rotates around (x, y), or around the center for circles.
    // Use a conservative square that contains every possible rotation.
    const ox = shape.type === "circle" ? b.centerX : shape.x;
    const oy = shape.type === "circle" ? b.centerY : shape.y;
    const r = Math.max(
      Math.hypot(left - ox, top - oy),
      Math.hypot(right - ox, top - oy),
      Math.hypot(left - ox, bottom - oy),
      Math.hypot(right - ox, bottom - oy),
    );
    left = ox - r;
    right = ox + r;
    top = oy - r;
    bottom = oy + r;
  }

  return { left, top, right, bottom };
}

/**
 * True if the shape may be visible. `pad` is in world units and should cover
 * stroke width plus a pop-in margin (e.g. 200 / camera.scale).
 * Conservative on purpose: a false positive wastes a draw, a false negative
 * makes a shape vanish.
 */
export function isShapeInViewport(shape: Shape, viewport: Viewport, pad = 0): boolean {
  let box = boxCache.get(shape);
  if (!box) {
    box = computeBox(shape);
    boxCache.set(shape, box);
  }
  return (
    box.right + pad >= viewport.left &&
    box.left - pad <= viewport.right &&
    box.bottom + pad >= viewport.top &&
    box.top - pad <= viewport.bottom
  );
}