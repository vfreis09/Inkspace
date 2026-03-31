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
  const trRef = useRef<any>(null);
  const selectedId = useStore((state) => state.selectedId);
  const selectShape = useStore((state) => state.selectShape);
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

  const stageRef = useRef<any>(null);

  useEffect(() => {
    const checkSize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
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
    const pow = Math.pow(2, Math.floor(log));
    return pow;
  }, [camera.scale]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const setTool = useStore.getState().setTool;

      if (key === "v") setTool("select");
      if (key === "r") setTool("rect");
      if (key === "o") setTool("circle");
      if (key === "l") setTool("line");
      if (key === "a") setTool("arrow");
      if (key === "h") setTool("pan");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (selectedId && trRef.current) {
      const stage = trRef.current.getStage();
      const selectedNode = stage.findOne("#" + selectedId);
      if (selectedNode) {
        trRef.current.nodes([selectedNode]);
        trRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId]);

  useEffect(() => {
    if (selectedId && trRef.current) {
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

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();

    const mousePointTo = {
      x: (stage.getPointerPosition().x - stage.x()) / oldScale,
      y: (stage.getPointerPosition().y - stage.y()) / oldScale,
    };

    let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    if (newScale < 0.01) newScale = 0.01;
    if (newScale > 50) newScale = 50;

    setCamera({
      scale: newScale,
      x: stage.getPointerPosition().x - mousePointTo.x * newScale,
      y: stage.getPointerPosition().y - mousePointTo.y * newScale,
    });
  };

  const getPointerPosition = (stage: any) => {
    const transform = stage.getAbsoluteTransform().copy().invert();
    const pos = transform.point(stage.getPointerPosition());
    return pos;
  };

  const handleMouseDown = (e: any) => {
    const stage = e.target.getStage();

    if (e.target === stage) {
      selectShape(null);
    }

    const pos = getPointerPosition(stage);

    if (["rect", "circle", "line", "arrow"].includes(currentTool)) {
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
        stroke:
          currentTool === "line" || currentTool === "arrow"
            ? "#6366f1"
            : undefined,
        strokeWidth:
          currentTool === "line" || currentTool === "arrow" ? 3 : undefined,
        points:
          currentTool === "line" || currentTool === "arrow"
            ? [0, 0, 0, 0]
            : undefined,
      });
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
      const dx = pos.x - drawStart.x;
      const dy = pos.y - drawStart.y;

      setCurrentShape({
        ...currentShape,
        points: [0, 0, dx, dy],
      });
    }
  };

  const handleMouseUp = (e: any) => {
    if (!isDrawing || !currentShape) return;

    const minThreshold = 5 / camera.scale;

    if (currentTool === "rect" || currentTool === "circle") {
      if (
        currentShape.width &&
        currentShape.height &&
        currentShape.width > minThreshold &&
        currentShape.height > minThreshold
      ) {
        addShape(currentShape as Omit<Shape, "id">);
      }
    } else if (currentTool === "line" || currentTool === "arrow") {
      const points = currentShape.points || [0, 0, 0, 0];
      const distance = Math.sqrt(points[2] ** 2 + points[3] ** 2);

      if (distance > minThreshold) {
        addShape(currentShape as Omit<Shape, "id">);
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
    setCurrentShape(null);
  };

  const renderShape = (shape: Shape, isTemp = false) => {
    const shapeKey = isTemp ? "temp-shape" : shape.id;

    const commonProps = {
      id: shape.id,
      draggable: !isTemp && currentTool === "select",
      onClick: (e: any) => {
        if (currentTool === "select") {
          e.cancelBubble = true;
          selectShape(shape.id);
        }
      },
      onDragEnd: (e: any) => {
        updateShape(shape.id, {
          x: e.target.x(),
          y: e.target.y(),
        });
      },
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
        if (container && currentTool === "select") {
          container.style.cursor = "grab";
        }
      },
      onMouseLeave: (e: any) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = "default";
      },
    };

    if (shape.type === "rect") {
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
    }

    if (shape.type === "circle") {
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
    }

    if (shape.type === "line") {
      return (
        <Line
          key={shapeKey}
          {...commonProps}
          x={shape.x}
          y={shape.y}
          points={shape.points || [0, 0, 0, 0]}
          stroke={shape.stroke}
          strokeWidth={
            shape.strokeWidth
              ? shape.strokeWidth / camera.scale
              : 3 / camera.scale
          }
          lineCap="round"
          lineJoin="round"
          opacity={isTemp ? 0.5 : 1}
        />
      );
    }

    if (shape.type === "arrow") {
      return (
        <Arrow
          key={shapeKey}
          {...commonProps}
          x={shape.x}
          y={shape.y}
          points={shape.points || [0, 0, 0, 0]}
          stroke={shape.stroke}
          strokeWidth={3 / camera.scale}
          fill={shape.stroke}
          lineCap="round"
          lineJoin="round"
          pointerLength={10 / camera.scale}
          pointerWidth={10 / camera.scale}
          opacity={isTemp ? 0.5 : 1}
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
      onDragEnd={(e) => {
        if (e.target === e.target.getStage()) {
          setCamera({
            ...camera,
            x: e.target.x(),
            y: e.target.y(),
          });
        }
      }}
    >
      <Layer>
        {gridImage && (
          <Rect
            x={-camera.x / camera.scale}
            y={-camera.y / camera.scale}
            width={size.width / camera.scale}
            height={size.height / camera.scale}
            fillPatternImage={gridImage}
            fillPatternScale={{
              x: dynamicGridScale,
              y: dynamicGridScale,
            }}
            fillPatternOffset={{ x: 0, y: 0 }}
            fillPatternRepeat="repeat"
            opacity={0.9}
            listening={false}
          />
        )}
        {shapes.map((shape) => renderShape(shape))}
        {selectedId && (
          <Transformer
            ref={trRef}
            boundBoxFunc={(oldBox, newBox) => {
              const minSize = 5 / camera.scale;
              if (
                Math.abs(newBox.width) < minSize ||
                Math.abs(newBox.height) < minSize
              ) {
                return oldBox;
              }
              return newBox;
            }}
          />
        )}
        {isDrawing && currentShape && renderShape(currentShape as Shape, true)}
      </Layer>
    </Stage>
  );
}
