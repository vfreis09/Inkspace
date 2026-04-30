"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  apiFetchBoards,
  apiCreateBoard,
  apiUpdateBoard,
  apiDeleteBoard,
} from "@/features/boards/services/boardApi";
import { Plus, LayoutDashboard, Loader2 } from "lucide-react";
import Header from "../Header/Header";

type Board = {
  id: string;
  name: string;
  updatedAt: string;
  _count: { shapes: number };
};

export default function BoardDashboard() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();

  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      openSignIn();
    } else if (isSignedIn) {
      fetchBoards();
    }
  }, [isLoaded, isSignedIn]);

  async function fetchBoards() {
    setIsLoading(true);
    try {
      const data = await apiFetchBoards();
      setBoards(data);
    } catch (err) {
      setError("Failed to load boards.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    const name = newBoardName.trim();
    if (!name) return;
    setIsCreating(true);
    try {
      const board = await apiCreateBoard(name);
      router.push(`/board/${board.id}`);
    } catch {
      setError("Failed to create board.");
    } finally {
      setIsCreating(false);
    }
  }

  if (!isLoaded) return null;

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
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleCreate}
            disabled={isCreating || !newBoardName.trim()}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            Create Board
          </button>
        </div>
        {error && <div className="mb-6 text-rose-400">{error}</div>}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <div
                key={board.id}
                className="group rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-indigo-500/50 cursor-pointer"
                onClick={() => router.push(`/board/${board.id}`)}
              >
                <div className="mb-4 h-28 rounded-xl bg-white/5 flex items-center justify-center">
                  <LayoutDashboard size={28} className="text-zinc-600" />
                </div>
                <h2 className="text-sm font-semibold truncate">{board.name}</h2>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
