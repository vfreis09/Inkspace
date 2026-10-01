import type { Shape } from "@/features/boards/store/useStore";

export type Bounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

export function getShapeBounds(shape: Shape): Bounds {
  let left = shape.x;
  let top = shape.y;
  let width = shape.width;
  let height = shape.height;

  if (shape.type === "line" || shape.type === "arrow" || shape.type === "pen") {
    const pts = shape.points ?? [0, 0, 0, 0];
    const xs = pts.filter((_, i) => i % 2 === 0);
    const ys = pts.filter((_, i) => i % 2 === 1);
    left = shape.x + Math.min(...xs);
    top = shape.y + Math.min(...ys);
    width = Math.max(...xs) - Math.min(...xs);
    height = Math.max(...ys) - Math.min(...ys);
  } else if (shape.type === "text") {
    // text width/height are never persisted, so estimate for a usable guide
    width = width || (shape.text?.length ?? 1) * (shape.fontSize ?? 20) * 0.6;
    height = height || (shape.fontSize ?? 20) * 1.2;
  }

  return {
    left,
    right: left + width,
    top,
    bottom: top + height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
}

export type GuideLines = {
  vertical: number[];
  horizontal: number[];
};

type SnapResult = {
  dx: number;
  dy: number;
  guides: GuideLines;
};

export function computeSnap(
  draggedBounds: Bounds,
  targets: Shape[],
  threshold: number,
): SnapResult {
  const vCandidates = [draggedBounds.left, draggedBounds.centerX, draggedBounds.right];
  const hCandidates = [draggedBounds.top, draggedBounds.centerY, draggedBounds.bottom];

  let bestDx = 0;
  let bestDxDist = threshold;
  let vGuide: number | null = null;

  let bestDy = 0;
  let bestDyDist = threshold;
  let hGuide: number | null = null;

  for (const target of targets) {
    const b = getShapeBounds(target);
    const vTargets = [b.left, b.centerX, b.right];
    const hTargets = [b.top, b.centerY, b.bottom];

    for (const vc of vCandidates) {
      for (const vt of vTargets) {
        const dist = Math.abs(vc - vt);
        if (dist < bestDxDist) {
          bestDxDist = dist;
          bestDx = vt - vc;
          vGuide = vt;
        }
      }
    }
    for (const hc of hCandidates) {
      for (const ht of hTargets) {
        const dist = Math.abs(hc - ht);
        if (dist < bestDyDist) {
          bestDyDist = dist;
          bestDy = ht - hc;
          hGuide = ht;
        }
      }
    }
  }

  return {
    dx: vGuide !== null ? bestDx : 0,
    dy: hGuide !== null ? bestDy : 0,
    guides: {
      vertical: vGuide !== null ? [vGuide] : [],
      horizontal: hGuide !== null ? [hGuide] : [],
    },
  };
}