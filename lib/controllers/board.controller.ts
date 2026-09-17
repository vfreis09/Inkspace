import {
  getBoardById,
  getBoardsByUserId,
  getMemberRole,
  createBoard,
  updateBoard,
  deleteBoard,
  updateMemberRole,
  removeMember,
} from "@/lib/services/board.service";

export async function listBoardsForUser(userId: string) {
  return getBoardsByUserId(userId);
}

export async function getBoardForUser(boardId: string, userId: string) {
  const board = await getBoardById(boardId);
  if (!board) return { ok: false, error: "not_found" };

  const role = await getMemberRole(boardId, userId);
  if (!board.isPublic && !role) return { ok: false, error: "forbidden" };

  return { ok: true, board };
}

export async function createBoardForUser(userId: string, name: string, isPublic: boolean) {
  if (!name.trim()) return { ok: false, error: "invalid_name" };
  const board = await createBoard(userId, name, isPublic);
  return { ok: true, board };
}

export async function updateBoardForUser(
  boardId: string,
  userId: string,
  data: { name?: string; isPublic?: boolean; inviteRole?: "editor" | "viewer" },
) {
  const role = await getMemberRole(boardId, userId);
  if (!role || role === "viewer") return { ok: false, error: "forbidden" };

  // Visibility and what the link grants are owner-only, even for editors
  if ((data.isPublic !== undefined || data.inviteRole !== undefined) && role !== "owner") {
    return { ok: false, error: "forbidden" };
  }

  const updated = await updateBoard(boardId, data);
  return { ok: true, board: updated };
}

export async function deleteBoardForUser(boardId: string, userId: string) {
  const role = await getMemberRole(boardId, userId);
  if (role !== "owner") return { ok: false, error: "forbidden" };

  await deleteBoard(boardId);
  return { ok: true };
}

export async function updateMemberRoleForBoard(
  boardId: string,
  actingUserId: string,
  targetUserId: string,
  role: "editor" | "viewer",
) {
  const actingRole = await getMemberRole(boardId, actingUserId);
  if (actingRole !== "owner") return { ok: false, error: "forbidden" };

  const board = await getBoardById(boardId);
  if (!board) return { ok: false, error: "not_found" };
  if (targetUserId === board.ownerId) return { ok: false, error: "cannot_change_owner" };

  const updated = await updateMemberRole(boardId, targetUserId, role);
  return { ok: true, member: updated };
}

export async function removeMemberFromBoard(
  boardId: string,
  actingUserId: string,
  targetUserId: string,
) {
  const actingRole = await getMemberRole(boardId, actingUserId);
  if (actingRole !== "owner") return { ok: false, error: "forbidden" };

  const board = await getBoardById(boardId);
  if (!board) return { ok: false, error: "not_found" };
  if (targetUserId === board.ownerId) return { ok: false, error: "cannot_remove_owner" };

  await removeMember(boardId, targetUserId);
  return { ok: true };
}