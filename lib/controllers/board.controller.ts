import {
  getBoardsByUserId,
  getBoardById,
  getMemberRole,
  createBoard,
  updateBoard,
  deleteBoard,
} from "@/lib/services/board.service";

export async function listBoardsForUser(userId: string) {
  return getBoardsByUserId(userId);
}

export type GetBoardResult =
  | { ok: true; board: Awaited<ReturnType<typeof getBoardById>> }
  | { ok: false; error: "not_found" | "forbidden" };

export async function getBoardForUser(
  boardId: string,
  userId: string,
): Promise<GetBoardResult> {
  const board = await getBoardById(boardId);
  if (!board) return { ok: false, error: "not_found" };

  const role = await getMemberRole(boardId, userId);
  if (!role) return { ok: false, error: "forbidden" };

  return { ok: true, board };
}

export type CreateBoardInput = {
  name: string;
  email: string; // temporary until Clerk webhook handles user creation
};

export type CreateBoardResult =
  | { ok: true; board: Awaited<ReturnType<typeof createBoard>> }
  | { ok: false; error: "invalid_name" };

export async function createBoardForUser(
  userId: string,
  input: CreateBoardInput,
): Promise<CreateBoardResult> {
  if (!input.name || input.name.trim().length === 0) {
    return { ok: false, error: "invalid_name" };
  }

  const board = await createBoard(
    userId,
    input.name,
    input.email ?? `${userId}@placeholder.dev`,
  );
  return { ok: true, board };
}

export type UpdateBoardResult =
  | { ok: true; board: Awaited<ReturnType<typeof updateBoard>> }
  | { ok: false; error: "not_found" | "forbidden" };

export async function updateBoardForUser(
  boardId: string,
  userId: string,
  data: { name?: string; thumbnail?: string },
): Promise<UpdateBoardResult> {
  const board = await getBoardById(boardId);
  if (!board) return { ok: false, error: "not_found" };

  const role = await getMemberRole(boardId, userId);
  if (!role || role === "viewer") return { ok: false, error: "forbidden" };

  const updated = await updateBoard(boardId, data);
  return { ok: true, board: updated };
}

export type DeleteBoardResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "forbidden" };

export async function deleteBoardForUser(
  boardId: string,
  userId: string,
): Promise<DeleteBoardResult> {
  const board = await getBoardById(boardId);
  if (!board) return { ok: false, error: "not_found" };

  const role = await getMemberRole(boardId, userId);
  if (!role || role !== "owner") return { ok: false, error: "forbidden" };

  await deleteBoard(boardId);
  return { ok: true };
}
