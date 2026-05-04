import {
  getBoardById,
  getBoardsByUserId,
  getMemberRole,
  createBoard,
  updateBoard,
  deleteBoard,
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

export async function createBoardForUser(userId: string, name: string) {
  if (!name.trim()) return { ok: false, error: "invalid_name" };
  const board = await createBoard(userId, name);
  return { ok: true, board };
}

export async function updateBoardForUser(
  boardId: string,
  userId: string,
  data: { name?: string; isPublic?: boolean },
) {
  const role = await getMemberRole(boardId, userId);

  if (!role || role === "viewer") return { ok: false, error: "forbidden" };

  const updated = await updateBoard(boardId, data);
  return { ok: true, board: updated };
}

export async function deleteBoardForUser(boardId: string, userId: string) {
  const role = await getMemberRole(boardId, userId);
  if (role !== "owner") return { ok: false, error: "forbidden" };

  await deleteBoard(boardId);
  return { ok: true };
}
