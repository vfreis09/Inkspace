"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Stage, Layer, Rect, Transformer } from "react-konva";
import { useStore } from "@/store/useStore";
import type { Shape, ShapeType } from "@/store/useStore";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Stage as KonvaStage } from "konva/lib/Stage";
import { MemoizedShape } from "@/components/MemoizedShape/MemoizedShape";

export default function Canvas() {
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [gridImage, setGridImage] = useState<HTMLImageElement | undefined>(
    undefined,
  );
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [localCurrentShape, setLocalCurrentShape] =
    useState<Partial<Shape> | null>(null);
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const [isZooming, setIsZooming] = useState(false);
  const zoomTimer = useRef<NodeJS.Timeout | null>(null);

  const {
    shapes,
    addShape,
    updateShape,
    currentTool,
    selectedIds,
    selectShapes,
    deleteShapes,
    brushSize,
  } = useStore();

  const stageRef = useRef<KonvaStage | null>(null);
  const trRef = useRef<any>(null);

  const dynamicGridScale = useMemo(
    () => Math.pow(2, Math.floor(Math.log2(1 / camera.scale))),
    [camera.scale],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIds.length > 0
      ) {
        if (e.target === document.body) {
          e.preventDefault();
          deleteShapes(selectedIds);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, deleteShapes]);

  useEffect(() => {
    const checkSize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const step = 40;
    canvas.width = step;
    canvas.height = step;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.strokeStyle = "#d1d1ca";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(step, 0);
      ctx.lineTo(step, step);
      ctx.lineTo(0, step);
      ctx.stroke();
      ctx.fillStyle = "#a1a19a";
      ctx.fillRect(step - 1, step - 1, 2, 2);
    }
    const img = new Image();
    img.src = canvas.toDataURL();
    img.onload = () => setGridImage(img);
  }, []);

  useEffect(() => {
    if (!trRef.current) return;
    const stage = trRef.current.getStage();
    if (!stage) return;

    const nodes = selectedIds
      .map((id) => stage.findOne("#" + id))
      .filter((n): n is any => !!n);

    trRef.current.nodes(nodes);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedIds]);

  useEffect(() => {
    if (trRef.current && selectedIds.length > 0) {
      trRef.current.forceUpdate();
      trRef.current.getLayer()?.batchDraw();
    }
  }, [camera.scale]);

  const getPointerPosition = (stage: KonvaStage) => {
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };
    return stage.getAbsoluteTransform().copy().invert().point(pos);
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    setIsZooming(true);
    if (zoomTimer.current) clearTimeout(zoomTimer.current);
    zoomTimer.current = setTimeout(() => setIsZooming(false), 100);

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    let newScale = e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;
    newScale = Math.min(Math.max(newScale, 0.001), 50);

    setCamera({
      scale: newScale,
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const handleDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (selectedIds.includes(e.target.id()) && trRef.current) {
        trRef.current.getLayer()?.batchDraw();
      }
    },
    [selectedIds],
  );

  const handleDragEnd = useCallback(
    (id: string, type: string, width: number, height: number) =>
      (e: KonvaEventObject<DragEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;

        if (selectedIds.includes(id)) {
          selectedIds.forEach((sid) => {
            const node = stage.findOne("#" + sid);
            if (!node) return;
            const shape = useStore.getState().shapes.find((s) => s.id === sid);
            if (shape?.type === "circle") {
              updateShape(sid, {
                x: node.x() - shape.width / 2,
                y: node.y() - shape.height / 2,
              });
            } else {
              updateShape(sid, { x: node.x(), y: node.y() });
            }
          });
        } else {
          updateShape(
            id,
            type === "circle"
              ? {
                  x: e.target.x() - width / 2,
                  y: e.target.y() - height / 2,
                }
              : { x: e.target.x(), y: e.target.y() },
          );
        }
      },
    [selectedIds, updateShape],
  );

  const handleTransformEnd = useCallback(
    (id: string, type: string, oldPoints?: number[]) =>
      (e: KonvaEventObject<Event>) => {
        const n = e.target;
        const sx = n.scaleX();
        const sy = n.scaleY();
        n.scaleX(1);
        n.scaleY(1);

        if (type === "rect") {
          updateShape(id, {
            x: n.x(),
            y: n.y(),
            rotation: n.rotation(),
            width: Math.max(5, n.width() * sx),
            height: Math.max(5, n.height() * sy),
          });
        } else if (type === "circle") {
          const newWidth = Math.max(5, n.width() * sx);
          const newHeight = Math.max(5, n.height() * sy);
          updateShape(id, {
            x: n.x() - newWidth / 2,
            y: n.y() - newHeight / 2,
            rotation: n.rotation(),
            width: newWidth,
            height: newHeight,
          });
        } else {
          updateShape(id, {
            x: n.x(),
            y: n.y(),
            rotation: n.rotation(),
            points: (oldPoints ?? [0, 0, 0, 0]).map((p, i) =>
              i % 2 === 0 ? p * sx : p * sy,
            ),
          });
        }
      },
    [updateShape],
  );

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = getPointerPosition(stage);
    const clickedOnStage = e.target === stage;

    if (currentTool === "select") {
      const id = e.target.id();
      if (id && selectedIds.includes(id)) return;
      if (clickedOnStage) {
        selectShapes([]);
        setDrawStart(pos);
        setSelectionRect({ ...pos, width: 0, height: 0 });
      } else if (id) {
        selectShapes([id]);
      }
      return;
    }

    if (currentTool === "pan") return;

    if (
      clickedOnStage &&
      ["rect", "circle", "line", "arrow"].includes(currentTool)
    ) {
      setDrawStart(pos);
      const { activeFill, activeStroke } = useStore.getState();
      setLocalCurrentShape({
        type: currentTool as ShapeType,
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        fill:
          currentTool === "rect" || currentTool === "circle"
            ? activeFill
            : "transparent",
        stroke: activeStroke,
        strokeWidth: brushSize,
        points: [0, 0, 0, 0],
        rotation: 0,
      });
    }
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage || !drawStart) return;
    const pos = getPointerPosition(stage);

    if (currentTool === "select" && selectionRect) {
      setSelectionRect({
        x: Math.min(pos.x, drawStart.x),
        y: Math.min(pos.y, drawStart.y),
        width: Math.abs(pos.x - drawStart.x),
        height: Math.abs(pos.y - drawStart.y),
      });
    } else if (localCurrentShape) {
      const w = pos.x - drawStart.x;
      const h = pos.y - drawStart.y;
      if (currentTool === "rect" || currentTool === "circle") {
        setLocalCurrentShape({
          ...localCurrentShape,
          width: Math.abs(w),
          height: Math.abs(h),
          x: w < 0 ? pos.x : drawStart.x,
          y: h < 0 ? pos.y : drawStart.y,
        });
      } else {
        setLocalCurrentShape({ ...localCurrentShape, points: [0, 0, w, h] });
      }
    }
  };

  const handleMouseUp = () => {
    if (selectionRect) {
      const overlapping = shapes
        .filter(
          (s) =>
            s.x >= selectionRect.x &&
            s.x + s.width <= selectionRect.x + selectionRect.width &&
            s.y >= selectionRect.y &&
            s.y + s.height <= selectionRect.y + selectionRect.height,
        )
        .map((s) => s.id);
      selectShapes(overlapping);
      setSelectionRect(null);
    } else if (localCurrentShape) {
      addShape(localCurrentShape as Omit<Shape, "id">);
      setLocalCurrentShape(null);
    }
    setDrawStart(null);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f8f8f7]">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={camera.x}
        y={camera.y}
        scaleX={camera.scale}
        scaleY={camera.scale}
        draggable={currentTool === "pan"}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onDragMove={(e) =>
          e.target === e.target.getStage() &&
          setCamera((prev) => ({ ...prev, x: e.target.x(), y: e.target.y() }))
        }
        style={{ cursor: currentTool === "pan" ? "grab" : "default" }}
      >
        <Layer>
          {gridImage && (
            <Rect
              x={-camera.x / camera.scale}
              y={-camera.y / camera.scale}
              width={size.width / camera.scale}
              height={size.height / camera.scale}
              fillPatternImage={gridImage}
              fillPatternScale={{ x: dynamicGridScale, y: dynamicGridScale }}
              fillPatternRepeat="repeat"
              opacity={0.8}
              listening={false}
            />
          )}
          {shapes.map((s) => (
            <MemoizedShape
              key={s.id}
              shape={s}
              isSelected={selectedIds.includes(s.id)}
              isSelectMode={currentTool === "select"}
              cameraScale={camera.scale}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd(s.id, s.type, s.width, s.height)}
              onTransformEnd={handleTransformEnd(s.id, s.type, s.points)}
            />
          ))}
          {selectionRect && (
            <Rect
              {...selectionRect}
              fill="rgba(99, 102, 241, 0.1)"
              stroke="#6366f1"
              strokeWidth={Math.min(1 / camera.scale, 2)}
              dash={[4 / camera.scale, 2 / camera.scale]}
              listening={false}
            />
          )}
          {localCurrentShape && (
            <MemoizedShape
              shape={{ ...localCurrentShape, id: "preview" } as Shape}
              isSelected={false}
              isSelectMode={false}
              cameraScale={camera.scale}
              onDragMove={() => {}}
              onDragEnd={() => {}}
              onTransformEnd={() => {}}
            />
          )}
          {selectedIds.length > 0 && (
            <Transformer
              ref={trRef}
              opacity={isZooming ? 0 : 1}
              rotateEnabled
              ignoreStroke={true}
              anchorSize={Math.min(8 / camera.scale, 20)}
              borderStrokeWidth={Math.min(1 / camera.scale, 2)}
              anchorStrokeWidth={Math.min(1 / camera.scale, 2)}
              boundBoxFunc={(oldB, newB) =>
                Math.abs(newB.width) < 5 / camera.scale ? oldB : newB
              }
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
