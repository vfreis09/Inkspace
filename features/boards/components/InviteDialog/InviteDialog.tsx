"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Copy, RefreshCw } from "lucide-react";
import { apiUpdateBoard } from "@/features/boards/services/boardApi";

type Member = {
  userId: string;
  role: "owner" | "editor" | "viewer";
  user: { name: string | null; email: string; avatarUrl: string | null };
};

type BoardDetails = {
  id: string;
  ownerId: string;
  isPublic: boolean;
  inviteRole: "editor" | "viewer";
  members: Member[];
};

type Snapshot = { id: string; createdAt: string };

const inputClass =
  "rounded-lg border border-black/10 bg-black/5 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-white/5";
const selectClass =
  "rounded-lg border border-black/10 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-white/10 dark:bg-zinc-800 dark:text-white";
const iconButtonClass =
  "rounded-lg border border-black/10 p-1.5 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5";
const sectionTitleClass = "mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300";
const rowClass = "flex items-center justify-between rounded-lg bg-black/5 px-3 py-2 dark:bg-white/5";

export function InviteDialog({ boardId }: { boardId: string }) {
  const [board, setBoard] = useState<BoardDetails | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [inviteAsRole, setInviteAsRole] = useState<"editor" | "viewer">("viewer");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const boardRes = await fetch(`/api/boards/${boardId}`, { credentials: "include" });
      if (!boardRes.ok) throw new Error("Failed to load board");
      const boardData = await boardRes.json();
      setBoard(boardData);

      // Only the owner can fetch the raw token; non-owners just won't see the link section
      const tokenRes = await fetch(`/api/boards/${boardId}/inviteToken`, { credentials: "include" });
      if (tokenRes.ok) {
        const { inviteToken } = await tokenRes.json();
        setInviteToken(inviteToken);
      }

      const snapshotsRes = await fetch(`/api/boards/${boardId}/snapshots`, { credentials: "include" });
      if (snapshotsRes.ok) {
        setSnapshots(await snapshotsRes.json());
      }
    } catch (err) {
      setError("Failed to load board details");
    } finally {
      setIsLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendInvite() {
    setInviteStatus(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteAsRole }),
      });
      if (res.ok) {
        setInviteStatus(`Invited ${email} as ${inviteAsRole}`);
        setEmail("");
        load();
      } else {
        const text = await res.text();
        setInviteStatus(text || "Failed to invite");
      }
    } catch {
      setInviteStatus("Failed to invite");
    }
  }

  async function toggleVisibility(next: boolean) {
    try {
      await apiUpdateBoard(boardId, { isPublic: next });
      setBoard((b) => (b ? { ...b, isPublic: next } : b));
    } catch {
      setError("Failed to update visibility");
    }
  }

  async function updateInviteRole(next: "editor" | "viewer") {
    try {
      await apiUpdateBoard(boardId, { inviteRole: next } as any);
      setBoard((b) => (b ? { ...b, inviteRole: next } : b));
    } catch {
      setError("Failed to update link role");
    }
  }

  async function regenerateLink() {
    try {
      const res = await fetch(`/api/boards/${boardId}/invite-link`, { method: "POST" });
      if (res.ok) {
        const { inviteToken } = await res.json();
        setInviteToken(inviteToken);
      }
    } catch {
      setError("Failed to regenerate link");
    }
  }

  async function changeMemberRole(userId: string, role: "editor" | "viewer") {
    try {
      const res = await fetch(`/api/boards/${boardId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) load();
      else setError("Failed to update role");
    } catch {
      setError("Failed to update role");
    }
  }

  async function removeMember(userId: string) {
    try {
      const res = await fetch(`/api/boards/${boardId}/members/${userId}`, { method: "DELETE" });
      if (res.ok) load();
      else setError("Failed to remove member");
    } catch {
      setError("Failed to remove member");
    }
  }

  async function restoreSnapshot(snapshotId: string) {
    if (!confirm("Restore this version? This will replace the board's current content for everyone.")) {
      return;
    }
    setIsRestoring(snapshotId);
    try {
      const res = await fetch(`/api/boards/${boardId}/snapshots/${snapshotId}/restore`, {
        method: "POST",
      });
      if (res.ok) {
        alert("Board restored.");
      } else {
        setError("Failed to restore this version");
      }
    } catch {
      setError("Failed to restore this version");
    } finally {
      setIsRestoring(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="animate-spin text-indigo-500" size={20} />
      </div>
    );
  }

  if (!board) {
    return <div className="p-6 text-sm text-rose-500 dark:text-rose-400">{error ?? "Couldn't load this board"}</div>;
  }

  const link = inviteToken
    ? `${window.location.origin}/board/${boardId}/join?invite=${inviteToken}`
    : null;

  return (
    <div className="max-h-[80vh] overflow-y-auto p-5 text-zinc-900 dark:text-white">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        Manage access
      </h2>
      {error && <p className="mb-3 text-xs text-rose-500 dark:text-rose-400">{error}</p>}

      {/* Invite by email */}
      <div className="mb-6">
        <h3 className={sectionTitleClass}>Invite by email</h3>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="person@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`flex-1 ${inputClass}`}
          />
          <select
            value={inviteAsRole}
            onChange={(e) => setInviteAsRole(e.target.value as "editor" | "viewer")}
            className={`${selectClass} py-1.5 text-sm`}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
          <button
            onClick={sendInvite}
            disabled={!email.trim()}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Invite
          </button>
        </div>
        {inviteStatus && <p className="mt-1 text-xs text-zinc-500">{inviteStatus}</p>}
      </div>

      {/* Visibility */}
      <div className="mb-6">
        <h3 className={sectionTitleClass}>Board visibility</h3>
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={board.isPublic}
            onChange={(e) => toggleVisibility(e.target.checked)}
          />
          Public — anyone with the link can join
        </label>
      </div>

      {/* Invite link */}
      {board.isPublic && link && (
        <div className="mb-6">
          <h3 className={sectionTitleClass}>Invite link</h3>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={link}
              className={`flex-1 text-xs text-zinc-600 dark:text-zinc-400 ${inputClass}`}
            />
            <button
              onClick={() => navigator.clipboard.writeText(link)}
              className={iconButtonClass}
              title="Copy link"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={regenerateLink}
              className={iconButtonClass}
              title="Regenerate link (revokes old one)"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            Link grants:
            <select
              value={board.inviteRole}
              onChange={(e) => updateInviteRole(e.target.value as "editor" | "viewer")}
              className={selectClass}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
          </label>
        </div>
      )}

      {/* Members */}
      <div>
        <h3 className={sectionTitleClass}>Members</h3>
        <div className="space-y-2">
          {board.members.map((m) => (
            <div key={m.userId} className={rowClass}>
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-800 dark:text-zinc-200">{m.user.name ?? m.user.email}</p>
                <p className="truncate text-xs text-zinc-500">{m.user.email}</p>
              </div>
              {m.role === "owner" ? (
                <span className="shrink-0 text-xs text-zinc-500">Owner</span>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  <select
                    value={m.role}
                    onChange={(e) => changeMemberRole(m.userId, e.target.value as "editor" | "viewer")}
                    className={selectClass}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onClick={() => removeMember(m.userId)}
                    className="text-xs text-rose-500 hover:underline dark:text-rose-400"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Version history */}
      {snapshots.length > 0 && (
        <div className="mt-6">
          <h3 className={sectionTitleClass}>Version history</h3>
          <div className="space-y-2">
            {snapshots.map((s) => (
              <div key={s.id} className={rowClass}>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {new Date(s.createdAt).toLocaleString()}
                </span>
                <button
                  onClick={() => restoreSnapshot(s.id)}
                  disabled={isRestoring === s.id}
                  className="rounded-lg border border-black/10 px-2 py-1 text-xs text-zinc-700 hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
                >
                  {isRestoring === s.id ? "Restoring..." : "Restore"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}