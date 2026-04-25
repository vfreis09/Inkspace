"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  apiFetchBoards,
  apiCreateBoard,
  apiUpdateBoard,
  apiDeleteBoard,
} from "@/features/boards/services/boardApi";
import { Plus, Pencil, Trash2, LayoutDashboard, Loader2 } from "lucide-react";
import Header from "../Header/Header";

type Board = {
  id: string;
  name: string;
  updatedAt: string;
  _count: { shapes: number };
};

export default function BoardDashboard() {
  const router = useRouter();
  const { openSignIn } = useClerk();
  const { isLoaded, isSignedIn } = useUser();

  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      openSignIn();
      setIsLoading(false);
      return;
    }

    fetchBoards();
  }, [isLoaded, isSignedIn]);

  async function fetchBoards() {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetchBoards();
      setBoards(data);
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED") {
        openSignIn();
        return;
      }

      setError("Failed to load boards.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    const name = newBoardName.trim();
    if (!name) return;

    if (!isSignedIn) {
      openSignIn();
      return;
    }

    setIsCreating(true);
    try {
      const board = await apiCreateBoard(name);
      setNewBoardName("");
      router.push(`/board/${board.id}`);
    } catch {
      setError("Failed to create board.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRename(boardId: string) {
    const name = editingName.trim();
    if (!name) return;

    try {
      const updated = await apiUpdateBoard(boardId, name);
      setBoards((prev) =>
        prev.map((b) => (b.id === boardId ? { ...b, name: updated.name } : b)),
      );
      setEditingId(null);
    } catch {
      setError("Failed to rename board.");
    }
  }

  async function handleDelete(boardId: string) {
    setDeletingId(boardId);

    try {
      await apiDeleteBoard(boardId);
      setBoards((prev) => prev.filter((b) => b.id !== boardId));
    } catch {
      setError("Failed to delete board.");
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <Header />
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="mb-10 flex items-center gap-3">
          <input
            type="text"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="New board name..."
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:bg-white/8"
          />
          <button
            onClick={handleCreate}
            disabled={isCreating || !newBoardName.trim()}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isCreating ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            Create Board
          </button>
        </div>
        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-zinc-500" />
          </div>
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <LayoutDashboard size={40} className="opacity-30" />
            <p className="text-sm">
              No boards yet. Create your first one above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <div
                key={board.id}
                className="group relative rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-indigo-500/50 hover:bg-white/8 transition-all cursor-pointer"
                onClick={() => {
                  if (editingId !== board.id) router.push(`/board/${board.id}`);
                }}
              >
                <div className="mb-4 h-28 rounded-xl bg-white/5 flex items-center justify-center">
                  <LayoutDashboard size={28} className="text-zinc-600" />
                </div>
                <h2 className="text-sm font-semibold text-white truncate">
                  {board.name}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {board._count.shapes} shapes • {formatDate(board.updatedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
