"use client";

import { Layer, Group, Path, Rect, Text } from "react-konva";
import { useCursorStore } from "@/features/boards/store/useCursorStore";

export default function RemoteCursorsLayer({ scale }: { scale: number }) {
  const cursors = useCursorStore((s) => s.cursors);

  return (
    <Layer listening={false}>
      {cursors.map((c) => (
        <Group
          key={c.connectionId}
          x={c.x}
          y={c.y}
          scaleX={1 / scale}
          scaleY={1 / scale}
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
            <Text text={c.name} fill="white" fontSize={10} fontStyle="bold" padding={4} />
          </Group>
        </Group>
      ))}
    </Layer>
  );
}