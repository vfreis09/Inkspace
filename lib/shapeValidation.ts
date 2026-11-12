import type { Shape } from "@/features/boards/store/useStore";

const SHAPE_TYPES = new Set(["rect", "circle", "line", "arrow", "pen", "text"]);
const NUMERIC_KEYS = [
  "x",
  "y",
  "width",
  "height",
  "rotation",
  "strokeWidth",
  "fontSize",
] as const;
const MAX_POINT_VALUES = 40_000;
const MAX_ORDER = 2_000_000_000;

export const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

export const isStr = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length <= max;

export const isIdList = (v: unknown, max = 10_000): v is string[] =>
  Array.isArray(v) &&
  v.length <= max &&
  v.every((id) => isStr(id, 64) && id.length > 0);

export const isGuestId = (v: unknown): v is string =>
  typeof v === "string" && v.startsWith("guest_") && v.length <= 64;

/**
 * Copies only the known fields out of `input`, checking each one.
 * Returns null if a known field is present but invalid.
 */
export function pickShapeProps(
  input: unknown,
  allowType: boolean,
): Partial<Shape> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const src = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const key of NUMERIC_KEYS) {
    const v = src[key];
    if (v === undefined || v === null) continue;
    if (!isNum(v)) return null;
    out[key] = v;
  }

  if (src.order !== undefined && src.order !== null) {
    const o = src.order;
    if (!Number.isInteger(o) || Math.abs(o as number) > MAX_ORDER) return null;
    out.order = o;
  }

  for (const key of ["fill", "stroke"] as const) {
    const v = src[key];
    if (v === undefined || v === null) continue;
    if (!isStr(v, 64)) return null;
    out[key] = v;
  }

  if (src.text !== undefined && src.text !== null) {
    if (!isStr(src.text, 10_000)) return null;
    out.text = src.text;
  }

  if (src.points !== undefined && src.points !== null) {
    const p = src.points;
    if (!Array.isArray(p) || p.length > MAX_POINT_VALUES || !p.every(isNum)) {
      return null;
    }
    out.points = p;
  }

  if (allowType) {
    if (typeof src.type !== "string" || !SHAPE_TYPES.has(src.type)) return null;
    out.type = src.type;
  }

  return out as Partial<Shape>;
}

/** A complete shape (used for shape:add and for undoing a delete). */
export function sanitizeShape(input: unknown): Shape | null {
  const id = (input as { id?: unknown } | null)?.id;
  if (!isStr(id, 64) || id.length === 0) return null;
  const props = pickShapeProps(input, true);
  if (
    !props ||
    props.type === undefined ||
    props.x === undefined ||
    props.y === undefined
  ) {
    return null;
  }
  return { ...props, id } as Shape;
}

/** Changed properties only (used for shape:update). Never contains id or type. */
export function sanitizeShapeUpdate(input: unknown): Partial<Shape> | null {
  const props = pickShapeProps(input, false);
  if (!props || Object.keys(props).length === 0) return null;
  return props;
}

/** One entry of a batch save: a full shape if it has a `type`, otherwise a partial update. */
export function sanitizeBatchItem(
  input: unknown,
): (Partial<Shape> & { id: string }) | null {
  const id = (input as { id?: unknown } | null)?.id;
  if (!isStr(id, 64) || id.length === 0) return null;

  const isFull = (input as { type?: unknown }).type !== undefined;
  const props = pickShapeProps(input, isFull);
  if (!props) return null;
  if (isFull && (props.x === undefined || props.y === undefined)) return null;
  return { ...props, id };
}