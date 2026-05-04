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
} from "lucide-react";
import {
  apiUpdateBoard,
  apiDeleteBoard,
} from "@/features/boards/services/boardApi";

interface Board {
  id: string;
  name: string;
  isPublic: boolean;
  updatedAt: string;
  thumbnail?: string;
}

interface BoardCardProps {
  board: Board;
  onAction: () => void;
}

export default function BoardCard({ board, onAction }: BoardCardProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [localBoard, setLocalBoard] = useState<Board>(board);

  const handleUpdate = async (updates: {
    name?: string;
    isPublic?: boolean;
  }) => {
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

  return (
    <div
      className="group relative rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-indigo-500/50 cursor-pointer transition-all"
      onClick={() => router.push(`/board/${localBoard.id}`)}
    >
      <div className="mb-4 h-28 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden transition-colors group-hover:bg-white/10">
        {localBoard.thumbnail ? (
          <img
            src={localBoard.thumbnail}
            alt={localBoard.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <LayoutDashboard size={28} className="text-zinc-600" />
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-200 truncate pr-2">
            {localBoard.name}
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1">
              {localBoard.isPublic ? (
                <Globe size={10} className="text-indigo-400" />
              ) : (
                <Lock size={10} />
              )}
              {localBoard.isPublic ? "Public" : "Private"}
            </span>
            <span>•</span>
            <span>{new Date(localBoard.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="rounded-lg p-2 hover:bg-white/10 text-zinc-400 transition-colors"
          >
            <MoreVertical size={16} />
          </button>
          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 z-30 w-40 rounded-xl border border-white/10 bg-zinc-900 p-1.5 shadow-2xl">
                <button
                  onClick={() => {
                    const newName = prompt("New name?", localBoard.name);
                    if (newName) handleUpdate({ name: newName.trim() });
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 transition-colors"
                >
                  <Pencil size={14} /> Rename
                </button>
                <button
                  onClick={() => {
                    handleUpdate({ isPublic: !localBoard.isPublic });
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 transition-colors"
                >
                  {localBoard.isPublic ? (
                    <Lock size={14} />
                  ) : (
                    <Globe size={14} />
                  )}
                  Make {localBoard.isPublic ? "Private" : "Public"}
                </button>
                <div className="my-1 h-[1px] bg-white/5" />
                <button
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
