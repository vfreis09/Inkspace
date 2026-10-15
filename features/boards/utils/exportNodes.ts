import Konva from "konva";
import type { Shape } from "@/features/boards/store/useStore";

export function createExportNode(s: Shape): Konva.Shape | null {
  const base = { rotation: s.rotation, listening: false };
  const styled = { ...base, fill: s.fill, stroke: s.stroke, strokeWidth: s.strokeWidth };

  switch (s.type) {
    case "rect":
      return new Konva.Rect({ ...styled, x: s.x, y: s.y, width: s.width, height: s.height, cornerRadius: 4 });
    case "circle":
      return new Konva.Circle({
        ...styled,
        x: s.x + s.width / 2,
        y: s.y + s.height / 2,
        radius: Math.abs(s.width / 2),
      });
    case "line":
      return new Konva.Line({
        ...styled, x: s.x, y: s.y, points: s.points ?? [0, 0, 0, 0], lineCap: "round", lineJoin: "round",
      });
    case "arrow":
      return new Konva.Arrow({
        ...styled, x: s.x, y: s.y, points: s.points ?? [0, 0, 0, 0],
        lineCap: "round", lineJoin: "round", pointerLength: 10, pointerWidth: 10,
      });
    case "pen":
      return new Konva.Line({
        ...base, stroke: s.stroke, strokeWidth: s.strokeWidth, x: s.x, y: s.y,
        points: s.points ?? [0, 0], tension: 0.5, lineCap: "round", lineJoin: "round",
      });
    case "text":
      return new Konva.Text({
        ...base, x: s.x, y: s.y, text: s.text ?? "", fontSize: s.fontSize ?? 20,
        fontFamily: "Arial", fill: s.fill,
      });
    default:
      return null;
  }
}