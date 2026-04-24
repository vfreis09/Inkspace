"use client";

import React from "react";
import { Rect, Circle, Line, Arrow } from "react-konva";
import type { Shape } from "@/features/boards/store/useStore";
import type { KonvaEventObject } from "konva/lib/Node";

interface MemoizedShapeProps {
  shape: Shape;
  isSelected: boolean;
  isSelectMode: boolean;
  cameraScale: number;
  onDragMove: (e: KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: KonvaEventObject<Event>) => void;
}

export const MemoizedShape = React.memo(
  ({
    shape,
    isSelectMode,
    cameraScale,
    onDragMove,
    onDragEnd,
    onTransformEnd,
  }: MemoizedShapeProps) => {
    const {
      x,
      y,
      width,
      height,
      id,
      fill,
      stroke,
      strokeWidth,
      rotation,
      type,
      points,
    } = shape;

    const commonProps = {
      id,
      fill,
      stroke,
      strokeWidth: strokeWidth / cameraScale,
      rotation,
      draggable: isSelectMode,
      onDragMove,
      onDragEnd,
      onTransformEnd,
    };

    if (type === "rect") {
      return (
        <Rect
          {...commonProps}
          x={x}
          y={y}
          width={width}
          height={height}
          cornerRadius={4 / cameraScale}
        />
      );
    }

    if (type === "circle") {
      return (
        <Circle
          {...commonProps}
          x={x + width / 2}
          y={y + height / 2}
          radius={Math.abs(width / 2)}
        />
      );
    }

    if (type === "line" || type === "arrow") {
      const Comp = type === "line" ? Line : Arrow;
      return (
        <Comp
          {...commonProps}
          x={x}
          y={y}
          points={points ?? [0, 0, 0, 0]}
          lineCap="round"
          lineJoin="round"
          {...(type === "arrow" && {
            pointerLength: 10 / cameraScale,
            pointerWidth: 10 / cameraScale,
          })}
        />
      );
    }

    return null;
  },
  (prev, next) =>
    prev.shape === next.shape &&
    prev.isSelected === next.isSelected &&
    prev.isSelectMode === next.isSelectMode &&
    prev.cameraScale === next.cameraScale,
);

MemoizedShape.displayName = "MemoizedShape";
