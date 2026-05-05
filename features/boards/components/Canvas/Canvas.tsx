"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Stage, Layer, Rect, Transformer, Group, Path, Text } from "react-konva";
import { useStore } from "@/features/boards/store/useStore";
import type {
  Shape,
  ShapeType,
  Action,
} from "@/features/boards/store/useStore";
import type { KonvaEventObject, Node as KonvaNode } from "konva/lib/Node";
import type { Stage as KonvaStage } from "konva/lib/Stage";
import type { Transformer as KonvaTransformer } from "konva/lib/shapes/Transformer";
import { MemoizedShape } from "@/features/boards/components/MemoizedShape/MemoizedShape";

export type RemoteCursor = {
  connectionId: string;
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
};

type CanvasProps = {
  onCursorMove?: (x: number, y: number) => void;
  onShapeAdd?: (shape: Shape) => void;
  onShapeUpdate?: (shapeId: string, props: Partial<Shape>) => void;
  onShapeDelete?: (ids: string[]) => void;
  cursors: RemoteCursor[];
};

export default function Canvas({
  onCursorMove,
  onShapeAdd,
  onShapeUpdate,
  onShapeDelete,
  cursors,
}: CanvasProps) {
  const {
    shapes,
    addShapeLocally,
    updateShapeLocally,
    deleteShapesLocally,
    currentTool,
    selectedIds,
    selectShapes,
    brushSize,
    undo,
    redo,
    setBroadcast,
  } = useStore();

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

  const stageRef = useRef<KonvaStage | null>(null);
  const trRef = useRef<KonvaTransformer | null>(null);

  const dynamicGridScale = useMemo(
    () => Math.pow(2, Math.floor(Math.log2(1 / camera.scale))),
    [camera.scale],
  );

  useEffect(() => {
    const check = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
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
    const stage = stageRef.current;
    if (!stage || !trRef.current) return;
    const nodes = selectedIds
      .map((id) => stage.findOne("#" + id))
      .filter((n): n is KonvaNode => !!n);
    trRef.current.nodes(nodes);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedIds]);

  const broadcastAction = useCallback(
    (action: Action, isUndo: boolean) => {
      switch (action.type) {
        case "ADD":
          if (isUndo) {
            onShapeDelete?.([action.shape.id]);
          } else {
            onShapeAdd?.(action.shape);
          }
          break;
        case "DELETE":
          if (isUndo) {
            action.shapes.forEach((s) => onShapeAdd?.(s));
          } else {
            onShapeDelete?.(action.shapes.map((s) => s.id));
          }
          break;
        case "UPDATE":
          onShapeUpdate?.(
            action.id,
            isUndo ? action.oldProps : action.newProps,
          );
          break;
        case "UPDATE_BATCH":
          action.updates.forEach((u) =>
            onShapeUpdate?.(u.id, isUndo ? u.oldProps : u.newProps),
          );
          break;
      }
    },
    [onShapeAdd, onShapeUpdate, onShapeDelete],
  );

  useEffect(() => {
    setBroadcast((action: Action) => broadcastAction(action, false));
    return () => setBroadcast(null);
  }, [setBroadcast, broadcastAction]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== document.body) return;

      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIds.length > 0
      ) {
        e.preventDefault();
        const ids = [...selectedIds];
        deleteShapesLocally(ids);
        onShapeDelete?.(ids);
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "z"
      ) {
        e.preventDefault();
        const action = undo();
        if (action) broadcastAction(action, true);
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" ||
          (e.shiftKey && e.key.toLowerCase() === "z"))
      ) {
        e.preventDefault();
        const action = redo();
        if (action) broadcastAction(action, false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedIds,
    deleteShapesLocally,
    undo,
    redo,
    onShapeDelete,
    broadcastAction,
  ]);

  const getPointerPosition = (stage: KonvaStage) => {
    const pos = stage.getPointerPosition();
    return pos
      ? stage.getAbsoluteTransform().copy().invert().point(pos)
      : { x: 0, y: 0 };
  };

  const handleDragEnd = useCallback(
    (id: string, type: string, width: number, height: number) =>
      (e: KonvaEventObject<DragEvent>) => {
        const n = e.target;
        const props =
          type === "circle"
            ? { x: n.x() - width / 2, y: n.y() - height / 2 }
            : { x: n.x(), y: n.y() };
        updateShapeLocally(id, props, true);
        onShapeUpdate?.(id, props);
      },
    [updateShapeLocally, onShapeUpdate],
  );

  const handleTransformEnd = useCallback(
    (id: string, type: string, oldPoints?: number[]) =>
      (e: KonvaEventObject<Event>) => {
        const n = e.target;
        const sx = n.scaleX();
        const sy = n.scaleY();
        n.scaleX(1);
        n.scaleY(1);
        let props: Partial<Shape> = {
          x: n.x(),
          y: n.y(),
          rotation: n.rotation(),
        };
        if (type === "rect") {
          props.width = Math.max(5, n.width() * sx);
          props.height = Math.max(5, n.height() * sy);
        } else if (type === "circle") {
          const nw = Math.max(5, n.width() * sx);
          const nh = Math.max(5, n.height() * sy);
          props = {
            ...props,
            x: n.x() - nw / 2,
            y: n.y() - nh / 2,
            width: nw,
            height: nh,
          };
        } else {
          props.points = (oldPoints ?? [0, 0, 0, 0]).map((p, i) =>
            i % 2 === 0 ? p * sx : p * sy,
          );
        }
        updateShapeLocally(id, props, true);
        onShapeUpdate?.(id, props);
      },
    [updateShapeLocally, onShapeUpdate],
  );

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = getPointerPosition(stage);

    if (currentTool === "select") {
      if (e.target === stage) {
        selectShapes([]);
        setDrawStart(pos);
        setSelectionRect({ ...pos, width: 0, height: 0 });
      } else if (e.target.id()) {
        selectShapes([e.target.id()]);
      }
      return;
    }

    if (
      e.target === stage &&
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
    if (!stage) return;
    const pos = getPointerPosition(stage);

    onCursorMove?.(pos.x, pos.y);

    if (!drawStart) return;

    if (selectionRect) {
      setSelectionRect({
        x: Math.min(pos.x, drawStart.x),
        y: Math.min(pos.y, drawStart.y),
        width: Math.abs(pos.x - drawStart.x),
        height: Math.abs(pos.y - drawStart.y),
      });
    } else if (localCurrentShape) {
      const w = pos.x - drawStart.x;
      const h = pos.y - drawStart.y;

      if (currentTool === "line" || currentTool === "arrow") {
        setLocalCurrentShape((prev) => ({
          ...prev,
          points: [0, 0, w, h],
        }));
      } else {
        setLocalCurrentShape((prev) => ({
          ...prev,
          width: Math.abs(w),
          height: Math.abs(h),
          x: w < 0 ? pos.x : drawStart.x,
          y: h < 0 ? pos.y : drawStart.y,
        }));
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
      const shape: Shape = {
        ...(localCurrentShape as Shape),
        id: crypto.randomUUID(),
      };
      setLocalCurrentShape(null);
      addShapeLocally(shape);
      onShapeAdd?.(shape);
    }
    setDrawStart(null);
  };

  if (size.width === 0) return null;

  return (
    <div className="h-screen w-screen bg-[#f8f8f7]">
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
        onWheel={(e) => {
          e.evt.preventDefault();
          const s = stageRef.current;
          if (!s) return;
          const oldScale = s.scaleX();
          const pointer = s.getPointerPosition();
          if (!pointer) return;
          const mousePointTo = {
            x: (pointer.x - s.x()) / oldScale,
            y: (pointer.y - s.y()) / oldScale,
          };
          let newScale = e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;
          newScale = Math.min(Math.max(newScale, 0.001), 50);
          setCamera({
            scale: newScale,
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
          });
        }}
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
              onDragMove={() => {}}
              onDragEnd={handleDragEnd(s.id, s.type, s.width, s.height)}
              onTransformEnd={handleTransformEnd(s.id, s.type, s.points)}
            />
          ))}
          {localCurrentShape && (
            <MemoizedShape
              key="preview"
              shape={{ ...(localCurrentShape as Shape), id: "preview" }}
              isSelected={false}
              isSelectMode={false}
              cameraScale={camera.scale}
              onDragMove={() => {}}
              onDragEnd={() => {}}
              onTransformEnd={() => {}}
            />
          )}
          {selectionRect && (
            <Rect
              {...selectionRect}
              fill="rgba(99, 102, 241, 0.1)"
              stroke="#6366f1"
              strokeWidth={1 / camera.scale}
              dash={[4 / camera.scale, 2 / camera.scale]}
              listening={false}
            />
          )}
          {selectedIds.length > 0 && (
            <Transformer
              ref={trRef}
              rotateEnabled
              ignoreStroke
              anchorSize={10 / camera.scale}
              borderStrokeWidth={1 / camera.scale}
              boundBoxFunc={(oldB, newB) =>
                Math.abs(newB.width) < 5 / camera.scale ? oldB : newB
              }
            />
          )}
        </Layer>
        <Layer listening={false}>
          {cursors.map((c) => (
            <Group
              key={c.connectionId}
              x={c.x}
              y={c.y}
              scaleX={1 / camera.scale}
              scaleY={1 / camera.scale}
            >
              <Path
                data="M 0 0 L 12 5 L 7 7 L 10 13 L 8 14 L 5 8 L 0 12 Z"
                fill={c.color}
                stroke="white"
                strokeWidth={1}
                shadowColor="rgba(0,0,0,0.4)"
                shadowBlur={4}
                shadowOffset={{ x: 0, y: 1 }}
              />
              <Group x={14} y={-4}>
                <Rect
                  fill={c.color}
                  cornerRadius={4}
                  height={16}
                  width={Math.max(32, c.name.length * 7)}
                  opacity={0.9}
                />
                <Text
                  text={c.name}
                  fill="white"
                  fontSize={10}
                  fontStyle="bold"
                  padding={4}
                />
              </Group>
            </Group>
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
