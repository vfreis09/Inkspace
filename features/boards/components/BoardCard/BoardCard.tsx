"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MoreVertical,
  Trash2,
  Globe,
  Lock,
  Pencil,
  LayoutDashboard,
  Users,
} from "lucide-react";
import {
  apiUpdateBoard,
  apiDeleteBoard,
} from "@/features/boards/services/boardApi";
import { InviteDialog } from "@/features/boards/components/InviteDialog/InviteDialog";

interface Board {
  id: string;
  name: string;
  isPublic: boolean;
  updatedAt: string;
  thumbnail?: string;
  ownerId?: string; // needed to know if the current user can manage it
}

interface BoardCardProps {
  board: Board;
  onAction: () => void;
  currentUserId?: string; // pass this down from BoardDashboard (useUser().user.id)
}

export default function BoardCard({ board, onAction, currentUserId }: BoardCardProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [localBoard, setLocalBoard] = useState<Board>(board);

  const isOwner = currentUserId && board.ownerId === currentUserId;

  const handleUpdate = async (updates: { name?: string; isPublic?: boolean }) => {
    setLocalBoard((prev) => ({ ...prev, ...updates }));
    try {
      await apiUpdateBoard(localBoard.id, updates);
      onAction();
    } catch (error) {
      setLocalBoard(board);
      console.error("Failed to update board", error);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this board?")) return;
    try {
      await apiDeleteBoard(localBoard.id);
      onAction();
    } catch (error) {
      console.error("Failed to delete board", error);
    }
  };

  useEffect(() => {
    setLocalBoard(board);
  }, [board]);

  const menuItemClass =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-700 transition-colors hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5";

  return (
    <div
      className="group relative cursor-pointer rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition-all hover:border-indigo-500/50 dark:border-white/10 dark:bg-white/5 dark:shadow-none"
      onClick={() => router.push(`/board/${localBoard.id}`)}
    >
      <div className="mb-4 flex h-28 items-center justify-center overflow-hidden rounded-xl bg-black/5 transition-colors group-hover:bg-black/10 dark:bg-white/5 dark:group-hover:bg-white/10">
        {localBoard.thumbnail ? (
          <img src={localBoard.thumbnail} alt={localBoard.name} className="h-full w-full object-cover" />
        ) : (
          <LayoutDashboard size={28} className="text-zinc-400 dark:text-zinc-600" />
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="truncate pr-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {localBoard.name}
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1">
              {localBoard.isPublic ? <Globe size={10} className="text-indigo-500 dark:text-indigo-400" /> : <Lock size={10} />}
              {localBoard.isPublic ? "Public" : "Private"}
            </span>
            <span>•</span>
            <span>{new Date(localBoard.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10"
          >
            <MoreVertical size={16} />
          </button>
          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute right-0 z-30 mt-2 w-44 rounded-xl border border-black/10 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-zinc-900">
                {isOwner && (
                  <button
                    onClick={() => {
                      setIsManageOpen(true);
                      setIsMenuOpen(false);
                    }}
                    className={menuItemClass}
                  >
                    <Users size={14} /> Manage access
                  </button>
                )}
                <button
                  onClick={() => {
                    const newName = prompt("New name?", localBoard.name);
                    if (newName) handleUpdate({ name: newName.trim() });
                    setIsMenuOpen(false);
                  }}
                  className={menuItemClass}
                >
                  <Pencil size={14} /> Rename
                </button>
                {isOwner && (
                  <button
                    onClick={() => {
                      handleUpdate({ isPublic: !localBoard.isPublic });
                      setIsMenuOpen(false);
                    }}
                    className={menuItemClass}
                  >
                    {localBoard.isPublic ? <Lock size={14} /> : <Globe size={14} />}
                    Make {localBoard.isPublic ? "Private" : "Public"}
                  </button>
                )}
                <div className="my-1 h-[1px] bg-black/5 dark:bg-white/5" />
                <button
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-500 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {isManageOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
          onClick={(e) => {
            e.stopPropagation();
            setIsManageOpen(false);
          }}
        >
          <div
            className="w-96 rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <InviteDialog boardId={localBoard.id} />
          </div>
        </div>
      )}
    </div>
  );
}