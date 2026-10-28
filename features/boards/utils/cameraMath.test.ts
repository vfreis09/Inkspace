import { describe, it, expect } from "vitest";
import {
  MAX_COORD,
  MAX_SCALE,
  MIN_SCALE,
  centerOnWorldPoint,
  clampScale,
  formatZoom,
  getViewportCenter,
  parseCoordinate,
  parseZoomPercent,
  zoomAroundPoint,
} from "./cameraMath";

describe("clampScale", () => {
  it("keeps values inside the range", () => {
    expect(clampScale(1)).toBe(1);
    expect(clampScale(0)).toBe(MIN_SCALE);
    expect(clampScale(1000)).toBe(MAX_SCALE);
  });
});

describe("parseZoomPercent", () => {
  it("parses plain and percent input", () => {
    expect(parseZoomPercent("100")).toBe(1);
    expect(parseZoomPercent("50")).toBe(0.5);
    expect(parseZoomPercent("85%")).toBeCloseTo(0.85);
    expect(parseZoomPercent("  50  ")).toBe(0.5);
  });
  it("treats a comma as a decimal point", () => {
    expect(parseZoomPercent("12,5")).toBe(0.125);
  });
  it("rejects unusable input", () => {
    expect(parseZoomPercent("")).toBeNull();
    expect(parseZoomPercent("abc")).toBeNull();
    expect(parseZoomPercent("0")).toBeNull();
    expect(parseZoomPercent("-5")).toBeNull();
    expect(parseZoomPercent("Infinity")).toBeNull();
  });
  it("clamps to the allowed range", () => {
    expect(parseZoomPercent("100000")).toBe(MAX_SCALE);
    expect(parseZoomPercent("0.0001")).toBe(MIN_SCALE);
  });
});

describe("parseCoordinate", () => {
  it("parses numbers, including negatives and decimals", () => {
    expect(parseCoordinate("10")).toBe(10);
    expect(parseCoordinate("-3.5")).toBe(-3.5);
    expect(parseCoordinate("1,5")).toBe(1.5);
    expect(parseCoordinate("1e3")).toBe(1000);
  });
  it("rejects unusable input", () => {
    expect(parseCoordinate("")).toBeNull();
    expect(parseCoordinate("x")).toBeNull();
    expect(parseCoordinate("Infinity")).toBeNull();
  });
  it("clamps huge values", () => {
    expect(parseCoordinate("1e9")).toBe(MAX_COORD);
    expect(parseCoordinate("-1e9")).toBe(-MAX_COORD);
  });
});

describe("formatZoom", () => {
  it("uses whole percents from 10% up and one decimal below", () => {
    expect(formatZoom(1)).toBe("100");
    expect(formatZoom(0.5)).toBe("50");
    expect(formatZoom(50)).toBe("5000");
    expect(formatZoom(0.05)).toBe("5.0");
    expect(formatZoom(0.001)).toBe("0.1");
  });
});

describe("zoomAroundPoint", () => {
  it("keeps the world point under the screen point fixed", () => {
    const cam = { x: 100, y: 50, scale: 2 };
    const out = zoomAroundPoint(cam, 4, { x: 400, y: 300 });
    expect(out).toEqual({ x: -200, y: -200, scale: 4 });
    expect((400 - out.x) / out.scale).toBeCloseTo((400 - cam.x) / cam.scale);
    expect((300 - out.y) / out.scale).toBeCloseTo((300 - cam.y) / cam.scale);
  });
  it("clamps the new scale", () => {
    expect(zoomAroundPoint({ x: 0, y: 0, scale: 1 }, 1000, { x: 0, y: 0 }).scale).toBe(MAX_SCALE);
  });
});

describe("centerOnWorldPoint and getViewportCenter", () => {
  it("puts the world point in the middle of the viewport", () => {
    expect(centerOnWorldPoint(2, 100, 50, 800, 600)).toEqual({ x: 200, y: 200, scale: 2 });
  });
  it("round-trips", () => {
    const cam = centerOnWorldPoint(1.5, -321, 777, 1280, 720);
    const c = getViewportCenter(cam, 1280, 720);
    expect(c.x).toBeCloseTo(-321);
    expect(c.y).toBeCloseTo(777);
  });
});