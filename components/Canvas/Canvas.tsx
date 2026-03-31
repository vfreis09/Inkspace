"use client";

import {
  Stage,
  Layer,
  Rect,
  Circle,
  Line,
  Arrow,
  Transformer,
} from "react-konva";
import { useState, useEffect, useMemo, useRef } from "react";
import { useStore } from "@/store/useStore";
import type { Shape } from "@/store/useStore";

export default function Canvas() {
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [gridImage, setGridImage] = useState<HTMLImageElement | undefined>(
    undefined,
  );
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [currentShape, setCurrentShape] = useState<Partial<Shape> | null>(null);

  const shapes = useStore((state) => state.shapes);
  const addShape = useStore((state) => state.addShape);
  const updateShape = useStore((state) => state.updateShape);
  const currentTool = useStore((state) => state.currentTool);
  const isDrawing = useStore((state) => state.isDrawing);
  const setIsDrawing = useStore((state) => state.setIsDrawing);
  const selectedId = useStore((state) => state.selectedId);
  const selectShape = useStore((state) => state.selectShape);

  const stageRef = useRef<any>(null);
  const trRef = useRef<any>(null);

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

  const dynamicGridScale = useMemo(() => {
    const log = Math.log2(1 / camera.scale);
    return Math.pow(2, Math.floor(log));
  }, [camera.scale]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { setTool, selectedId, deleteShape } = useStore.getState();
      const key = e.key.toLowerCase();
      const toolMap: Record<string, string> = {
        v: "select",
        r: "rect",
        o: "circle",
        l: "line",
        a: "arrow",
        h: "pan",
      };

      if (toolMap[key]) {
        setTool(toolMap[key] as any);
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        if (
          e.target === document.body ||
          (e.target as HTMLElement).tagName === "CANVAS"
        ) {
          e.preventDefault();
          deleteShape(selectedId);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (trRef.current && selectedId) {
      const stage = trRef.current.getStage();
      const selectedNode = stage.findOne("#" + selectedId);
      if (selectedNode) {
        trRef.current.nodes([selectedNode]);
        trRef.current.getLayer().batchDraw();
      }
    } else if (trRef.current) {
      trRef.current.nodes([]);
    }
  }, [selectedId]);

  const getPointerPosition = (stage: any) => {
    const transform = stage.getAbsoluteTransform().copy().invert();
    return transform.point(stage.getPointerPosition());
  };

  const handleMouseDown = (e: any) => {
    const stage = e.target.getStage();
    const clickedOnStage = e.target === stage;

    if (currentTool === "pan") {
      selectShape(null);
      return;
    }

    if (!clickedOnStage) {
      const shapeNode = e.target;
      const shapeId = shapeNode.id();
      if (shapeId) {
        selectShape(shapeId);
        if (currentTool !== "select") {
          useStore.getState().setTool("select");
          setTimeout(() => shapeNode.startDrag(), 0);
        }
        return;
      }
    }

    if (clickedOnStage) {
      selectShape(null);
      if (["rect", "circle", "line", "arrow"].includes(currentTool)) {
        const pos = getPointerPosition(stage);
        setIsDrawing(true);
        setDrawStart(pos);
        setCurrentShape({
          type: currentTool as any,
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
          fill:
            currentTool === "rect" || currentTool === "circle"
              ? "#6366f1"
              : "transparent",
          stroke: "#6366f1",
          strokeWidth: 3,
          points:
            currentTool === "line" || currentTool === "arrow"
              ? [0, 0, 0, 0]
              : undefined,
        });
      }
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || !drawStart || !currentShape) return;
    const stage = e.target.getStage();
    const pos = getPointerPosition(stage);

    if (currentTool === "rect" || currentTool === "circle") {
      const width = pos.x - drawStart.x;
      const height = pos.y - drawStart.y;
      setCurrentShape({
        ...currentShape,
        width: Math.abs(width),
        height: Math.abs(height),
        x: width < 0 ? pos.x : drawStart.x,
        y: height < 0 ? pos.y : drawStart.y,
      });
    } else if (currentTool === "line" || currentTool === "arrow") {
      setCurrentShape({
        ...currentShape,
        points: [0, 0, pos.x - drawStart.x, pos.y - drawStart.y],
      });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentShape) return;
    const minThreshold = 5 / camera.scale;
    const validRect =
      (currentShape.width ?? 0) > minThreshold &&
      (currentShape.height ?? 0) > minThreshold;
    const pts = currentShape.points || [0, 0, 0, 0];
    const validLine = Math.sqrt(pts[2] ** 2 + pts[3] ** 2) > minThreshold;

    if (
      (["rect", "circle"].includes(currentTool as string) && validRect) ||
      (["line", "arrow"].includes(currentTool as string) && validLine)
    ) {
      addShape(currentShape as Omit<Shape, "id">);
    }
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentShape(null);
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const mousePointTo = {
      x: (stage.getPointerPosition().x - stage.x()) / oldScale,
      y: (stage.getPointerPosition().y - stage.y()) / oldScale,
    };
    let newScale = e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;
    newScale = Math.min(Math.max(newScale, 0.01), 50);
    setCamera({
      scale: newScale,
      x: stage.getPointerPosition().x - mousePointTo.x * newScale,
      y: stage.getPointerPosition().y - mousePointTo.y * newScale,
    });
  };

  const renderShape = (shape: Shape, isTemp = false) => {
    const shapeKey = isTemp ? "temp-shape" : shape.id;
    const commonProps = {
      id: shape.id,
      draggable: !isTemp && currentTool === "select",
      onDragStart: () => selectShape(shape.id),
      onDragEnd: (e: any) =>
        updateShape(shape.id, { x: e.target.x(), y: e.target.y() }),
      onTransformEnd: (e: any) => {
        const node = e.target;
        updateShape(shape.id, {
          x: node.x(),
          y: node.y(),
          width: node.width() * node.scaleX(),
          height: node.height() * node.scaleY(),
        });
        node.scaleX(1);
        node.scaleY(1);
      },
      onMouseEnter: (e: any) => {
        const container = e.target.getStage()?.container();
        if (container && currentTool === "select")
          container.style.cursor = "grab";
      },
      onMouseLeave: (e: any) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = "default";
      },
    };

    if (shape.type === "rect")
      return (
        <Rect
          key={shapeKey}
          {...commonProps}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={shape.fill}
          cornerRadius={4 / camera.scale}
          opacity={isTemp ? 0.5 : 1}
        />
      );
    if (shape.type === "circle")
      return (
        <Circle
          key={shapeKey}
          {...commonProps}
          x={shape.x}
          y={shape.y}
          radius={Math.abs(shape.width / 2)}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          opacity={isTemp ? 0.5 : 1}
          offsetX={-(shape.width / 2)}
          offsetY={-(shape.height / 2)}
        />
      );
    if (shape.type === "line" || shape.type === "arrow") {
      const Comp = shape.type === "line" ? Line : Arrow;
      return (
        <Comp
          key={shapeKey}
          {...commonProps}
          x={shape.x}
          y={shape.y}
          points={shape.points || [0, 0, 0, 0]}
          stroke={shape.stroke || "#6366f1"}
          strokeWidth={3 / camera.scale}
          fill={shape.stroke || "#6366f1"}
          lineCap="round"
          lineJoin="round"
          opacity={isTemp ? 0.5 : 1}
          {...(shape.type === "arrow" && {
            pointerLength: 10 / camera.scale,
            pointerWidth: 10 / camera.scale,
          })}
        />
      );
    }
    return null;
  };

  return (
    <Stage
      ref={stageRef}
      width={size.width}
      height={size.height}
      draggable={
        currentTool === "pan" || (currentTool === "select" && !isDrawing)
      }
      x={camera.x}
      y={camera.y}
      scaleX={camera.scale}
      scaleY={camera.scale}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: currentTool === "pan" ? "grab" : "default" }}
      onDragEnd={(e) =>
        e.target === e.target.getStage() &&
        setCamera({ ...camera, x: e.target.x(), y: e.target.y() })
      }
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
            opacity={0.9}
            listening={false}
          />
        )}
        {shapes.map((s) => renderShape(s))}
        {selectedId && (
          <Transformer
            ref={trRef}
            boundBoxFunc={(oldB, newB) =>
              Math.abs(newB.width) < 5 / camera.scale ? oldB : newB
            }
          />
        )}
        {isDrawing && currentShape && renderShape(currentShape as Shape, true)}
      </Layer>
    </Stage>
  );
}
