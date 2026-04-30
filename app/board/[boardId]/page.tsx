"use client";

import React, { useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import Toolbar from "@/features/boards/components/Toolbar/Toolbar";
import ColorPicker from "@/features/boards/components/ColorPicker/ColorPicker";
import { useStore } from "@/features/boards/store/useStore";
import { RemoteCursor, usePartyKit } from "@/features/boards/hooks/usePartyKit";

const Canvas = dynamic(
  () => import("@/features/boards/components/Canvas/Canvas"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-900 text-white">
        Loading canvas...
      </div>
    ),
  },
);

export default function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const boardId = resolvedParams.boardId;

  const {
    loadBoard,
    isBoardLoading,
    boardError,
    isColorPickerOpen,
    toggleColorPicker,
  } = useStore();
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);

  const { sendCursor, sendShapeAdd, sendShapeUpdate, sendShapeDelete } =
    usePartyKit(boardId, setRemoteCursors);

  useEffect(() => {
    if (boardId) loadBoard(boardId);
  }, [boardId, loadBoard]);

  if (boardError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-zinc-900 text-white">
        <p className="text-rose-400 text-sm">{boardError}</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
        >
          Back to boards
        </button>
      </div>
    );
  }

  if (isBoardLoading)
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-900 text-white">
        <p className="text-sm opacity-60">Loading board...</p>
      </div>
    );

  return (
    <main className="h-screen w-full overflow-hidden bg-[#fdfdfb] flex flex-col">
      <div className="relative flex-1">
        <div className="absolute left-4 top-4 z-10 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-400 backdrop-blur-md hover:text-white"
          >
            ← Boards
          </button>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-2 text-white backdrop-blur-md">
            <h1 className="text-sm font-bold">Inkspace Engine v0.2</h1>
            <p className="text-xs opacity-60">Scroll to zoom • Drag to pan</p>
          </div>
        </div>
        <Toolbar />
        {isColorPickerOpen && (
          <div className="fixed left-24 top-1/2 -translate-y-1/2 z-50">
            <ColorPicker onClose={toggleColorPicker} />
          </div>
        )}
        <Canvas
          cursors={remoteCursors}
          onCursorMove={sendCursor}
          onShapeAdd={sendShapeAdd}
          onShapeUpdate={sendShapeUpdate}
          onShapeDelete={sendShapeDelete}
        />
      </div>
    </main>
  );
}
