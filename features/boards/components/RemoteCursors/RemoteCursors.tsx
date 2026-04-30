"use client";

type Cursor = {
  connectionId: string;
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
};

type Props = {
  cursors: Cursor[];
  currentUserId: string;
};

export default function RemoteCursors({ cursors, currentUserId }: Props) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {cursors
        .filter((c) => c.userId !== currentUserId)
        .map((cursor) => (
          <div
            key={cursor.connectionId}
            className="absolute flex items-center gap-1 transition-transform duration-75 ease-linear"
            style={{
              transform: `translate(${cursor.x}px, ${cursor.y}px)`,
              left: 0,
              top: 0,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill={cursor.color}
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
            >
              <path d="M0 0 L0 12 L3.5 8.5 L6.5 14 L8 13.5 L5 7.5 L9 7.5 Z" />
            </svg>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.name}
            </span>
          </div>
        ))}
    </div>
  );
}
