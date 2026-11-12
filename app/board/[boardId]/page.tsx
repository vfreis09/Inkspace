"use client";

import { useEffect, use, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { User, Globe, LayoutDashboard, ChevronLeft, Users } from "lucide-react";
import Toolbar from "@/features/boards/components/Toolbar/Toolbar";
import ColorPicker from "@/features/boards/components/ColorPicker/ColorPicker";
import { useStore } from "@/features/boards/store/useStore";
import { usePartyKit } from "@/features/boards/hooks/usePartyKit";
import LayerControls from "@/features/boards/components/LayerControls/LayerControls";
import ThemeToggle from "@/features/boards/components/theme/ThemeToggle";
import { installStressTools } from "@/features/boards/utils/devStress";
import { useCursorStore } from "@/features/boards/store/useCursorStore";
import { InviteDialog } from "@/features/boards/components/InviteDialog/InviteDialog";


const Canvas = dynamic(
  () => import("@/features/boards/components/Canvas/Canvas"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-xs font-medium text-zinc-500">
            Initializing Canvas...
          </p>
        </div>
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
  

  const loadBoard = useStore((s) => s.loadBoard);
  const isBoardLoading = useStore((s) => s.isBoardLoading);
  const boardError = useStore((s) => s.boardError);
  const isColorPickerOpen = useStore((s) => s.isColorPickerOpen);
  const toggleColorPicker = useStore((s) => s.toggleColorPicker);

  const setCursors = useCursorStore((s) => s.setCursors);

  const {
    activeUsers,
    sendCursor,
    sendShapeAdd,
    sendShapeUpdate,
    sendShapeDelete,
    isGuest,
    guestName,
    setGuestName,
    canEdit,
    role,
    status,
    wasKicked,
  } = usePartyKit(boardId, setCursors);

  const [isManageOpen, setIsManageOpen] = useState(false);

  useEffect(() => {
    if (wasKicked) {
      alert("You no longer have access to this board.");
      router.push("/");
    }
  }, [wasKicked, router]);

  useEffect(() => {
    if (boardId) loadBoard(boardId);
  }, [boardId, loadBoard]);

  const hasShapes = useStore((s) => s.shapes.length > 0);
  const deleteShapesLocally = useStore((s) => s.deleteShapesLocally);

  const handleClearBoard = () => {
    const { shapes } = useStore.getState();
    if (!canEdit || shapes.length === 0) return;
    if (!window.confirm("Clear the entire board? This can be undone with Ctrl+Z.")) return;

    const ids = shapes.map((s) => s.id);
    deleteShapesLocally(ids);
    sendShapeDelete(ids);
  };

  useEffect(() => {
    installStressTools();
  }, []);

   useEffect(() => {
    return () => useCursorStore.getState().setCursors([]);
  }, [boardId]);

  if (boardError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-[#0a0a0a] text-white">
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full bg-rose-500/10 p-4 text-rose-500">
            <Globe size={32} />
          </div>
          <h2 className="text-lg font-semibold">Board unreachable</h2>
          <p className="text-sm text-zinc-500">{boardError}</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 rounded-xl bg-white/5 px-6 py-3 text-sm font-medium transition-colors hover:bg-white/10"
        >
          <ChevronLeft size={16} />
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (isBoardLoading)
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0a] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-2 w-48 overflow-hidden rounded-full bg-white/5">
            <div className="h-full w-1/3 animate-[loading_1.5s_infinite_ease-in-out] rounded-full bg-indigo-500" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
            Syncing Engine
          </p>
        </div>
      </div>
    );

  return (
    <main className="h-screen w-full overflow-hidden bg-zinc-100 dark:bg-[#161616] flex flex-col">
      <div className="relative flex-1">
        <div className="absolute left-4 top-4 z-20 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/90 text-zinc-400 backdrop-blur-md transition-all hover:text-white"
            title="Back to Boards"
          >
            <LayoutDashboard size={18} />
          </button>
          <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-zinc-900/90 px-4 py-2 text-white backdrop-blur-md">
            <div className="pr-4 border-r border-white/10">
              <h1 className="text-xs font-bold tracking-tight">
                INKSPACE ENGINE <span className="text-indigo-400">v0.2</span>
              </h1>
              <p className="text-[10px] text-zinc-500">Multiplayer Canvas</p>
            </div>
            {role === "owner" && (
              <>
                <button
                  onClick={() => setIsManageOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-indigo-500 active:scale-95"
                >
                  <Users size={12} />
                  MANAGE ACCESS
                </button>
                <div className="h-6 w-px bg-white/10" />
              </>
            )}
            <ThemeToggle />
            </div>
        </div>
        {isGuest && (
          <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2">
            <div className="group flex items-center gap-3 rounded-full border border-white/10 bg-zinc-900/90 px-4 py-2 shadow-2xl backdrop-blur-xl transition-all hover:border-indigo-500/50">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                <User size={14} strokeWidth={2.5} />
              </div>

              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-500">
                  Guest Session
                </span>
                <input
                  className="w-32 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-zinc-700"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your name..."
                  maxLength={24}
                />
              </div>
              <div className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </div>
            </div>
          </div>
        )}
        <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-2">
          <div className="flex -space-x-2 overflow-hidden">
            {activeUsers.map((u) => (
              <div
                key={u.connectionId}
                title={u.name}
                style={{ borderColor: u.color }}
                className="relative inline-block h-9 w-9 rounded-full border-2 bg-zinc-800 shadow-lg transition-transform hover:-translate-y-1"
              >
                {u.avatarUrl ? (
                  <img
                    src={u.avatarUrl}
                    alt={u.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] font-black text-white uppercase">
                    {u.name?.charAt(0) || "?"}
                  </div>
                )}
              </div>
            ))}
          </div>
          <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest bg-zinc-900/80 px-2 py-0.5 rounded-md backdrop-blur-sm border border-white/10">
            {activeUsers.length} online
          </span>
        </div>
        <Toolbar
          canEdit={canEdit}
          onClearBoard={handleClearBoard}
          hasShapes={hasShapes}
        />
        <LayerControls canEdit={canEdit} />
        {isColorPickerOpen && canEdit && (
        <div className="fixed left-24 top-1/2 -translate-y-1/2 z-50">
          <ColorPicker onClose={toggleColorPicker} />
        </div>
        )}
        <Canvas
          onCursorMove={sendCursor}
          onShapeAdd={sendShapeAdd}
          onShapeUpdate={sendShapeUpdate}
          onShapeDelete={sendShapeDelete}
          canEdit={canEdit}
        />
        {status !== "online" && (
          <div className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-full border border-amber-500/30 bg-zinc-900/90 px-3 py-1 text-[11px] text-amber-400">
            {status === "connecting"
              ? "Connecting…"
              : "Offline. Reconnecting, editing is paused."}
          </div>
        )}
        {isManageOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
            onClick={() => setIsManageOpen(false)}
          >
            <div
              className="w-96 rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900"
              onClick={(e) => e.stopPropagation()}
            >
              <InviteDialog boardId={boardId} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
