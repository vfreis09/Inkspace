"use client";

import React from "react";
import { Rect, Circle, Line, Arrow, Text} from "react-konva";
import type { Shape } from "@/features/boards/store/useStore";
import type { KonvaEventObject } from "konva/lib/Node";

interface MemoizedShapeProps {
  shape: Shape;
  isSelected: boolean;
  isSelectMode: boolean;
  canEdit: boolean;
  isEditing?: boolean;
  onDragStart: (e: KonvaEventObject<DragEvent>) => void;
  onDragMove: (e: KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: KonvaEventObject<Event>) => void;
  onDblClick?: (e: KonvaEventObject<MouseEvent>) => void;
}

export const MemoizedShape = React.memo(
  ({
    shape,
    isSelectMode,
    canEdit,
    isEditing,
    onDragStart,
    onDragMove,
    onDragEnd,
    onTransformEnd,
    onDblClick,
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
      text,
      fontSize,
    } = shape;

    const commonProps = {
      id,
      fill,
      stroke,
      strokeWidth,
      strokeScaleEnabled: false,
      rotation,
      draggable: isSelectMode && canEdit,
      onDragMove,
      onDragEnd,
      onDragStart,
      onTransformEnd,
      onDblClick,
    };

    if (type === "rect") {
      return (
        <Rect
          {...commonProps}
          x={x}
          y={y}
          width={width}
          height={height}
          cornerRadius={4}
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
            pointerLength: 10,
            pointerWidth: 10,
          })}
        />
      );
    }

    if (type === "pen") {
      return (
        <Line
          {...commonProps}
          x={x}
          y={y}
          points={points ?? [0, 0]}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          fill={undefined}
        />
      );
    }
    
    if (type === "text") {
      if (isEditing) return null;

      return (
        <Text
          {...commonProps}
          x={x}
          y={y}
          text={text ?? ""}
          fontSize={fontSize ?? 20}
          fontFamily="Arial"
          fill={fill}
          stroke={undefined}
          strokeWidth={undefined}
        />
      );
    }

    return null;
  },
  (prev, next) =>
    prev.shape === next.shape &&
    prev.isSelected === next.isSelected &&
    prev.isSelectMode === next.isSelectMode &&
    prev.canEdit === next.canEdit &&
    prev.isEditing === next.isEditing &&
    prev.onDragStart === next.onDragStart &&
    prev.onDragMove === next.onDragMove &&
    prev.onDragEnd === next.onDragEnd &&
    prev.onTransformEnd === next.onTransformEnd &&
    prev.onDblClick === next.onDblClick,
);

MemoizedShape.displayName = "MemoizedShape";
