"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Stage, Layer, Rect, Transformer, Group, Path, Text, Line } from "react-konva";
import { useStore } from "@/features/boards/store/useStore";
import type {
  Shape,
  ShapeType,
  Action,
  Tool,
} from "@/features/boards/store/useStore";
import type { KonvaEventObject, Node as KonvaNode } from "konva/lib/Node";
import type { Stage as KonvaStage } from "konva/lib/Stage";
import type { Transformer as KonvaTransformer } from "konva/lib/shapes/Transformer";
import { MemoizedShape } from "@/features/boards/components/MemoizedShape/MemoizedShape";
import { compareByOrder } from "@/features/boards/utils/layerOrder";
import { getShapeBounds, getShapesBoundingBox, computeSnap, type GuideLines } from "@/features/boards/utils/alignmentGuides";
import { Download, Home, Maximize } from "lucide-react";
import Konva from "konva";


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
  canEdit?: boolean;
};

const TOOL_SHORTCUTS: Record<string, Tool> = {
  v: "select",
  h: "pan",
  r: "rect",
  o: "circle",
  l: "line",
  a: "arrow",
  p: "pen",
  t: "text",
};
const EDIT_ONLY_TOOLS: Tool[] = ["rect", "circle", "line", "arrow", "pen", "text"];

const SNAP_THRESHOLD_PX = 8;
const CAMERA_PADDING_PX = 80;
const EXPORT_PADDING = 40;
const EXPORT_MAX_SIDE_PX = 8192;
const EXPORT_MAX_AREA_PX = 16_000_000;

export default function Canvas({
  onCursorMove,
  onShapeAdd,
  onShapeUpdate,
  onShapeDelete,
  cursors,
  canEdit = true,
}: CanvasProps) {
  const {
    shapes,
    addShapeLocally,
    updateShapeLocally,
    updateShapesBatchLocally,
    deleteShapesLocally,
    currentTool,
    setTool,
    selectedIds,
    selectShapes,
    brushSize,
    undo,
    redo,
    setBroadcast,
    reorderSelected,
    showGrid,
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
  const mainLayerRef = useRef<Konva.Layer | null>(null);

  const dynamicGridScale = useMemo(
    () => Math.pow(2, Math.floor(Math.log2(1 / camera.scale))),
    [camera.scale],
  );

  const viewport = useMemo(
    () => ({
      left: -camera.x / camera.scale,
      top: -camera.y / camera.scale,
      right: (-camera.x + size.width) / camera.scale,
      bottom: (-camera.y + size.height) / camera.scale,
    }),
    [camera, size],
  );

  const orderedShapes = useMemo(
    () => [...shapes].sort(compareByOrder),
    [shapes],
  );

  const [editingText, setEditingText] = useState<{
    id: string | null;
    x: number;
    y: number;
    value: string;
    fontSize: number;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const editingTextRef = useRef(editingText);
  editingTextRef.current = editingText;

  const [guides, setGuides] = useState<GuideLines>({ vertical: [], horizontal: [] });
  const SNAP_THRESHOLD_PX = 8;

  const shiftSelectRef = useRef(false);

  const [worldPointer, setWorldPointer] = useState({ x: 0, y: 0 });

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

  const hasFocusedRef = useRef(false);

  useEffect(() => {
    if (editingText && !hasFocusedRef.current) {
      hasFocusedRef.current = true;
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
    if (!editingText) {
      hasFocusedRef.current = false;
    }
  }, [editingText]);

  const TOOL_SHORTCUTS: Record<string, Tool> = {
    v: "select",
    h: "pan",
    r: "rect",
    o: "circle",
    l: "line",
    a: "arrow",
    p: "pen",
    t: "text",
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      if (
        canEdit &&
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

      if (canEdit && (e.ctrlKey || e.metaKey) && selectedIds.length > 0) {
        const right = e.key === "]" || e.key === "}";
        const left = e.key === "[" || e.key === "{";
        if (right || left) {
          e.preventDefault();
          reorderSelected(
            right ? (e.shiftKey ? "front" : "forward") : (e.shiftKey ? "back" : "backward"),
          );
        }
      }

      // Tool switching
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = e.key.toLowerCase();
        const tool = TOOL_SHORTCUTS[key];
        if (tool && !(EDIT_ONLY_TOOLS.includes(tool) && !canEdit)) {
          e.preventDefault();
          setTool(tool);
        }
      }

      // Escape to deselect (only when not editing text — that's handled separately in the textarea)
      if (e.key === "Escape" && selectedIds.length > 0) {
        e.preventDefault();
        selectShapes([]);
      }

      // Select all
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selectShapes(shapes.map((s) => s.id));
      }

      // Nudge selected shape(s) with arrow keys
      if (
        canEdit &&
        selectedIds.length > 0 &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;

        const updates = selectedIds.map((id) => {
          const shape = shapes.find((s) => s.id === id)!;
          return {
            id,
            oldProps: { x: shape.x, y: shape.y },
            newProps: { x: shape.x + dx, y: shape.y + dy },
          };
        });

        updateShapesBatchLocally(updates);
        updates.forEach((u) => onShapeUpdate?.(u.id, u.newProps));
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
    canEdit,
    reorderSelected,
    setTool,
    selectShapes,
    shapes,
    updateShapesBatchLocally,
    onShapeUpdate,
  ]);

  const getPointerPosition = (stage: KonvaStage) => {
    const pos = stage.getPointerPosition();
    return pos
      ? stage.getAbsoluteTransform().copy().invert().point(pos)
      : { x: 0, y: 0 };
  };

  const groupDragOffsets = useRef<Map<string, { x: number; y: number }>>(new Map());

  const handleShapeDragStart = useCallback(
    (id: string) => (e: KonvaEventObject<DragEvent>) => {
      setGuides({ vertical: [], horizontal: [] });
      if (!canEdit || selectedIds.length <= 1 || !selectedIds.includes(id)) return;
      const stage = e.target.getStage();
      if (!stage) return;

      groupDragOffsets.current.clear();
      selectedIds.forEach((sid) => {
        if (sid === id) return;
        const node = stage.findOne("#" + sid);
        if (node) {
          groupDragOffsets.current.set(sid, {
            x: node.x() - e.target.x(),
            y: node.y() - e.target.y(),
          });
        }
      });
    },
    [canEdit, selectedIds],
  );


  const handleShapeDragMove = useCallback(
    (id: string) => (e: KonvaEventObject<DragEvent>) => {
      if (!canEdit) return;
      const stage = e.target.getStage();
      if (!stage) return;

      const shape = shapes.find((s) => s.id === id);
      if (!shape) return;

      const isGroup = selectedIds.length > 1 && selectedIds.includes(id);

      if (isGroup) {
        const draggedX = e.target.x();
        const draggedY = e.target.y();
        groupDragOffsets.current.forEach((offset, sid) => {
          const node = stage.findOne("#" + sid);
          if (node) {
            node.x(draggedX + offset.x);
            node.y(draggedY + offset.y);
          }
        });
      }

      const liveX = shape.type === "circle" ? e.target.x() - shape.width / 2 : e.target.x();
      const liveY = shape.type === "circle" ? e.target.y() - shape.height / 2 : e.target.y();

      const draggedBounds = getShapeBounds({ ...shape, x: liveX, y: liveY });
      const targets = shapes.filter((s) =>
        isGroup ? !selectedIds.includes(s.id) : s.id !== id,
      );
      const threshold = SNAP_THRESHOLD_PX / camera.scale;
      const { dx, dy, guides: newGuides } = computeSnap(draggedBounds, targets, threshold);

      if (dx !== 0 || dy !== 0) {
        e.target.x(e.target.x() + dx);
        e.target.y(e.target.y() + dy);
        if (isGroup) {
          groupDragOffsets.current.forEach((_, sid) => {
            const node = stage.findOne("#" + sid);
            if (node) {
              node.x(node.x() + dx);
              node.y(node.y() + dy);
            }
          });
        }
      }

      setGuides(newGuides);

      trRef.current?.forceUpdate?.();
      trRef.current?.getLayer()?.batchDraw();
    },
    [canEdit, selectedIds, shapes, camera.scale],
  );

  const handleTextDblClick = useCallback(
    (shape: Shape) => {
      if (!canEdit || shape.type !== "text") return;
      selectShapes([]);
      setEditingText({
        id: shape.id,
        x: shape.x,
        y: shape.y,
        value: shape.text ?? "",
        fontSize: shape.fontSize ?? 20,
      });
    },
    [canEdit, selectShapes],
  );

  const commitTextEdit = useCallback(() => {
    const current = editingTextRef.current;
    if (!current) return;
    editingTextRef.current = null;

    const trimmed = current.value.trim();

    if (current.id) {
      if (trimmed === "") {
        deleteShapesLocally([current.id]);
        onShapeDelete?.([current.id]);
      } else {
        const props = { text: trimmed };
        updateShapeLocally(current.id, props, true);
        onShapeUpdate?.(current.id, props);
      }
    } else if (trimmed !== "") {
      const { activeFill } = useStore.getState();
      const shape: Shape = {
        id: crypto.randomUUID(),
        order: useStore.getState().getNextOrder(),
        type: "text",
        x: current.x,
        y: current.y,
        width: 0,
        height: 0,
        rotation: 0,
        fill: activeFill,
        stroke: activeFill,
        strokeWidth: 1,
        text: trimmed,
        fontSize: current.fontSize,
      };
      addShapeLocally(shape);
      onShapeAdd?.(shape);
    }

    setEditingText(null);
  }, [addShapeLocally, updateShapeLocally, deleteShapesLocally, onShapeAdd, onShapeUpdate, onShapeDelete]);

  const cancelTextEdit = useCallback(() => {
    editingTextRef.current = null;
    setEditingText(null);
  }, []);

  const handleDragEnd = useCallback(
    (id: string, type: string, width: number, height: number) =>
      (e: KonvaEventObject<DragEvent>) => {
        if (!canEdit) return;
        setGuides({ vertical: [], horizontal: [] });
        const n = e.target;
        const draggedProps =
          type === "circle"
            ? { x: n.x() - width / 2, y: n.y() - height / 2 }
            : { x: n.x(), y: n.y() };

        if (selectedIds.length > 1 && selectedIds.includes(id)) {
          const stage = n.getStage();
          const updates = selectedIds.map((sid) => {
            const shape = shapes.find((s) => s.id === sid)!;
            if (sid === id) {
              return { id: sid, oldProps: { x: shape.x, y: shape.y }, newProps: draggedProps };
            }
            const node = stage?.findOne("#" + sid);
            const nx = node ? (shape.type === "circle" ? node.x() - shape.width / 2 : node.x()) : shape.x;
            const ny = node ? (shape.type === "circle" ? node.y() - shape.height / 2 : node.y()) : shape.y;
            return { id: sid, oldProps: { x: shape.x, y: shape.y }, newProps: { x: nx, y: ny } };
          });

          updateShapesBatchLocally(updates);
          updates.forEach((u) => onShapeUpdate?.(u.id, u.newProps));
          groupDragOffsets.current.clear();
          return;
        }

        updateShapeLocally(id, draggedProps, true);
        onShapeUpdate?.(id, draggedProps);
      },
    [canEdit, updateShapeLocally, onShapeUpdate, selectedIds, shapes, updateShapesBatchLocally],
  );

  const handleTransformEnd = useCallback(
    (id: string, type: string, oldPoints?: number[], oldFontSize?: number) =>
      (e: KonvaEventObject<Event>) => {
        if (!canEdit) return;
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
          props = { ...props, x: n.x() - nw / 2, y: n.y() - nh / 2, width: nw, height: nh };
        } else if (type === "text") {
          const scale = (sx + sy) / 2;
          props.fontSize = Math.max(8, (oldFontSize ?? 20) * scale);
        } else {
          props.points = (oldPoints ?? [0, 0, 0, 0]).map((p, i) =>
            i % 2 === 0 ? p * sx : p * sy,
          );
        }
        updateShapeLocally(id, props, true);
        onShapeUpdate?.(id, props);
      },
    [canEdit, updateShapeLocally, onShapeUpdate],
  );

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    if (e.evt.button !== 0) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = getPointerPosition(stage);

    if (editingTextRef.current) {
      commitTextEdit();
      return;
    }

    if (currentTool === "select") {
      const isShift = e.evt.shiftKey;
      shiftSelectRef.current = isShift;

      if (e.target === stage) {
        if (!isShift) selectShapes([]);
        setDrawStart(pos);
        setSelectionRect({ ...pos, width: 0, height: 0 });
      } else if (e.target.id()) {
        const clickedId = e.target.id();
        const currentSelection = useStore.getState().selectedIds;

        if (isShift) {
          selectShapes(
            currentSelection.includes(clickedId)
              ? currentSelection.filter((id) => id !== clickedId)
              : [...currentSelection, clickedId],
          );
        } else if (!currentSelection.includes(clickedId)) {
          selectShapes([clickedId]);
        }
      }
      return;
    }

    if (canEdit && e.target === stage && currentTool === "pen") {
      const { activeStroke } = useStore.getState();
      setDrawStart(pos);
      setLocalCurrentShape({
        type: "pen",
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        fill: "transparent",
        stroke: activeStroke,
        strokeWidth: brushSize,
        points: [0, 0],
        rotation: 0,
      });
      return;
    }

    if (canEdit && e.target === stage && currentTool === "text") {
      setEditingText({ id: null, x: pos.x, y: pos.y, value: "", fontSize: 20 });
      return;
    }

    if (
      canEdit &&
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

    setWorldPointer(pos);

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
      } else if (currentTool === "pen" && localCurrentShape) {
          setLocalCurrentShape((prev) => {
            if (!prev || !prev.points) return prev;
            const points = prev.points;
            // points are relative to drawStart (prev.x, prev.y)
            const relX = pos.x - drawStart.x;
            const relY = pos.y - drawStart.y;

            const lastX = points[points.length - 2];
            const lastY = points[points.length - 1];
            const dist = Math.hypot(relX - lastX, relY - lastY);

            if (dist < 3) return prev; // throttle: skip points that are too close together

            return { ...prev, points: [...points, relX, relY] };
          });
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
        const currentSelection = useStore.getState().selectedIds;
      selectShapes(
        shiftSelectRef.current
          ? Array.from(new Set([...currentSelection, ...overlapping]))
          : overlapping,
      );
      setSelectionRect(null);
    } else if (canEdit && localCurrentShape) {
      const shape: Shape = {
        ...(localCurrentShape as Shape),
        id: crypto.randomUUID(),
        order: useStore.getState().getNextOrder(),
      };
      setLocalCurrentShape(null);
      addShapeLocally(shape);
      onShapeAdd?.(shape);
    }
    setDrawStart(null);
  };

  const CAMERA_PADDING_PX = 80;

  const handleResetCamera = useCallback(() => {
    setCamera({ x: 0, y: 0, scale: 1 });
  }, []);

  const handleZoomToFit = useCallback(() => {
    const box = getShapesBoundingBox(shapes);
    if (!box || size.width === 0) return;

    const boxWidth = box.right - box.left;
    const boxHeight = box.bottom - box.top;

    if (boxWidth === 0 && boxHeight === 0) {
      // Single point / zero-size content — just center on it at a sane default zoom
      setCamera({
        x: size.width / 2 - box.left,
        y: size.height / 2 - box.top,
        scale: 1,
      });
      return;
    }

    const availableWidth = size.width - CAMERA_PADDING_PX * 2;
    const availableHeight = size.height - CAMERA_PADDING_PX * 2;

    let scale = Math.min(
      availableWidth / Math.max(boxWidth, 1),
      availableHeight / Math.max(boxHeight, 1),
    );
    scale = Math.min(Math.max(scale, 0.001), 50); // respect your existing zoom clamp

    const boxCenterX = (box.left + box.right) / 2;
    const boxCenterY = (box.top + box.bottom) / 2;

    setCamera({
      scale,
      x: size.width / 2 - boxCenterX * scale,
      y: size.height / 2 - boxCenterY * scale,
    });
  }, [shapes, size]);


  const EXPORT_PADDING = 40;
  const EXPORT_MAX_SIDE_PX = 8192;
  const EXPORT_MAX_AREA_PX = 16_000_000;

  const handleExportPNG = useCallback(() => {
    const mainLayer = mainLayerRef.current;
    if (!mainLayer || shapes.length === 0) return;

    const shapeIds = new Set(shapes.map((s) => s.id));
    const nodes = mainLayer.getChildren((n) => shapeIds.has(n.id()));
    if (nodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
      const r = n.getClientRect({ skipStroke: true, relativeTo: mainLayer });
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.width);
      maxY = Math.max(maxY, r.y + r.height);
    });

    const originX = minX - EXPORT_PADDING;
    const originY = minY - EXPORT_PADDING;
    const worldW = Math.max(maxX - minX, 1) + EXPORT_PADDING * 2;
    const worldH = Math.max(maxY - minY, 1) + EXPORT_PADDING * 2;

    const pr = Math.min(
      2,
      EXPORT_MAX_SIDE_PX / Math.max(worldW, worldH),
      Math.sqrt(EXPORT_MAX_AREA_PX / (worldW * worldH)),
    );

    const exportStage = new Konva.Stage({
      container: document.createElement("div"),
      width: Math.ceil(worldW * pr),
      height: Math.ceil(worldH * pr),
    });
    exportStage.scale({ x: pr, y: pr });

    const exportLayer = new Konva.Layer();
    exportLayer.getCanvas().setPixelRatio(1);
    exportStage.add(exportLayer);

    exportLayer.add(
      new Konva.Rect({ x: 0, y: 0, width: worldW, height: worldH, fill: "#f8f8f7", listening: false }),
    );

    const k = camera.scale;
    nodes.forEach((n) => {
      const c = n.clone({ x: n.x() - originX, y: n.y() - originY, draggable: false });
      ["strokeWidth", "cornerRadius", "pointerLength", "pointerWidth"].forEach((attr) => {
        const v = c.getAttr(attr);
        if (typeof v === "number") c.setAttr(attr, v * k);
      });
      exportLayer.add(c);
    });

    exportStage
      .toBlob({ pixelRatio: 1 })
      .then((blob) => {
        if (!blob) throw new Error("empty blob");
        const url = URL.createObjectURL(blob as Blob);
        const link = document.createElement("a");
        link.download = `inkspace-board-${Date.now()}.png`;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      })
      .catch((err) => {
        console.error("Export failed:", err);
        alert("Export failed. Try again, or zoom in closer to your shapes.");
      })
      .finally(() => exportStage.destroy());
  }, [shapes, camera.scale]);

  if (size.width === 0) return null;

  return (
    <div className="h-screen w-screen bg-[#f8f8f7]">
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
        <button
          onClick={handleResetCamera}
          title="Reset view (0,0, 100%)"
          className="rounded-xl border border-white/10 bg-zinc-900/90 p-3 text-zinc-400 shadow-2xl backdrop-blur-md transition-colors hover:bg-white/5 hover:text-white"
        >
          <Home size={18} />
        </button>
        <button
          onClick={handleZoomToFit}
          disabled={shapes.length === 0}
          title="Zoom to fit all shapes"
          className="rounded-xl border border-white/10 bg-zinc-900/90 p-3 text-zinc-400 shadow-2xl backdrop-blur-md transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Maximize size={18} />
        </button>
        <button
          onClick={handleExportPNG}
          disabled={shapes.length === 0}
          title="Export as PNG"
          className="rounded-xl border border-white/10 bg-zinc-900/90 p-3 text-zinc-400 shadow-2xl backdrop-blur-md transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={18} />
        </button>
      </div>
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
        onContextMenu={(e) => e.evt.preventDefault()}
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
        <Layer ref={mainLayerRef}>
          {gridImage && showGrid && (
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
          {orderedShapes.map((s) => (
            <MemoizedShape
              key={s.id}
              shape={s}
              isSelected={selectedIds.includes(s.id)}
              isSelectMode={currentTool === "select"}
              canEdit={canEdit}
              cameraScale={camera.scale}
              isEditing={editingText?.id === s.id}
              onDragStart={handleShapeDragStart(s.id)}
              onDragMove={handleShapeDragMove(s.id)}
              onDragEnd={handleDragEnd(s.id, s.type, s.width, s.height)}
              onTransformEnd={handleTransformEnd(s.id, s.type, s.points, s.fontSize)}
              onDblClick={() => handleTextDblClick(s)}
            />
          ))}
          {guides.vertical.map((x) => (
            <Line
              key={`v-${x}`}
              points={[x, viewport.top, x, viewport.bottom]}
              stroke="#ff4d8d"
              strokeWidth={1 / camera.scale}
              dash={[4 / camera.scale, 4 / camera.scale]}
              listening={false}
            />
          ))}
          {guides.horizontal.map((y) => (
            <Line
              key={`h-${y}`}
              points={[viewport.left, y, viewport.right, y]}
              stroke="#ff4d8d"
              strokeWidth={1 / camera.scale}
              dash={[4 / camera.scale, 4 / camera.scale]}
              listening={false}
            />
          ))}
          {localCurrentShape && (
            <MemoizedShape
              key="preview"
              shape={{ ...(localCurrentShape as Shape), id: "preview" }}
              isSelected={false}
              isSelectMode={false}
              canEdit={canEdit}
              cameraScale={camera.scale}
              onDragStart={() => {}}
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
          {selectedIds.length > 0 && canEdit && !editingText && (
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
      {editingText && (
        <textarea
          ref={textareaRef}
          value={editingText.value}
          autoFocus
          rows={1}
          wrap="off"
          onChange={(e) =>
            setEditingText((prev) => (prev ? { ...prev, value: e.target.value } : prev))
          }
          onBlur={commitTextEdit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancelTextEdit();
            } else if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commitTextEdit();
            }
          }}
          className="absolute z-40 resize-none overflow-hidden whitespace-pre border border-dashed border-indigo-500 bg-transparent outline-none"
          style={{
            left: editingText.x * camera.scale + camera.x,
            top: editingText.y * camera.scale + camera.y,
            fontSize: Math.min(Math.max(editingText.fontSize * camera.scale, 8), 120),
            lineHeight: 1,
            fontFamily: "Arial, sans-serif",
            color: useStore.getState().activeFill,
            padding: 0,
            margin: 0,
            width: `${Math.max(...editingText.value.split("\n").map((l) => l.length), 1) + 1}ch`,
            height: `${editingText.value.split("\n").length}em`,
          }}
        />
      )}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-900/90 px-3 py-1.5 text-[11px] font-mono text-zinc-400 backdrop-blur-md">
        <span>{Math.round(camera.scale * 100)}%</span>
        <span className="text-zinc-700">|</span>
        <span>
          x: {Math.round(worldPointer.x)}, y: {Math.round(worldPointer.y)}
        </span>
      </div>
    </div>
  );
}
