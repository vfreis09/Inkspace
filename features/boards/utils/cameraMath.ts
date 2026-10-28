export const MIN_SCALE = 0.001;
export const MAX_SCALE = 50;
export const MAX_COORD = 1_000_000;

export type Camera = { x: number; y: number; scale: number };

export const clampScale = (s: number) => Math.min(Math.max(s, MIN_SCALE), MAX_SCALE);

// Accepts "85", "85%", " 85 " and "12,5" (comma as decimal). Returns null if unusable.
function parseNumber(input: string): number | null {
  const cleaned = input.trim().replace("%", "").replace(",", ".").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** "85" or "85%" -> 0.85, clamped. Zero, negative and non-numeric input -> null. */
export function parseZoomPercent(input: string): number | null {
  const n = parseNumber(input);
  if (n === null || n <= 0) return null;
  return clampScale(n / 100);
}

/** World coordinate, clamped to ±MAX_COORD. Non-numeric input -> null. */
export function parseCoordinate(input: string): number | null {
  const n = parseNumber(input);
  if (n === null) return null;
  return Math.min(Math.max(n, -MAX_COORD), MAX_COORD);
}

/** Text for the zoom field: whole percent from 10% up, one decimal below. */
export function formatZoom(scale: number): string {
  const pct = scale * 100;
  return pct >= 10 ? String(Math.round(pct)) : pct.toFixed(1);
}

/** New camera at newScale that keeps the world point under `screenPoint` fixed. */
export function zoomAroundPoint(
  camera: Camera,
  newScale: number,
  screenPoint: { x: number; y: number },
): Camera {
  const scale = clampScale(newScale);
  const wx = (screenPoint.x - camera.x) / camera.scale;
  const wy = (screenPoint.y - camera.y) / camera.scale;
  return { x: screenPoint.x - wx * scale, y: screenPoint.y - wy * scale, scale };
}

/** Camera that puts world point (wx, wy) in the middle of the viewport. */
export function centerOnWorldPoint(
  scale: number,
  wx: number,
  wy: number,
  viewportWidth: number,
  viewportHeight: number,
): Camera {
  const s = clampScale(scale);
  return { x: viewportWidth / 2 - wx * s, y: viewportHeight / 2 - wy * s, scale: s };
}

/** World coordinate currently at the middle of the viewport. */
export function getViewportCenter(
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number } {
  return {
    x: (viewportWidth / 2 - camera.x) / camera.scale,
    y: (viewportHeight / 2 - camera.y) / camera.scale,
  };
}