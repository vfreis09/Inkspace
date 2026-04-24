import {
  getShapesByBoardId,
  getShapeById,
  createShape,
  updateShape,
  deleteShape,
  batchUpsertShapes,
  type ShapeCreateInput,
  type ShapeUpdateInput,
  type BatchInput,
} from "@/lib/services/shape.service";
import { getMemberRole } from "@/lib/services/board.service";
import { getBoardById } from "@/lib/services/board.service";

export type ListShapesResult =
  | { ok: true; shapes: Awaited<ReturnType<typeof getShapesByBoardId>> }
  | { ok: false; error: "not_found" | "forbidden" };

export async function listShapesForBoard(
  boardId: string,
  userId: string,
): Promise<ListShapesResult> {
  const board = await getBoardById(boardId);
  if (!board) return { ok: false, error: "not_found" };

  const role = await getMemberRole(boardId, userId);
  if (!role) return { ok: false, error: "forbidden" };

  const shapes = await getShapesByBoardId(boardId);
  return { ok: true, shapes };
}

export type CreateShapeResult =
  | { ok: true; shape: Awaited<ReturnType<typeof createShape>> }
  | { ok: false; error: "not_found" | "forbidden" };

export async function createShapeOnBoard(
  boardId: string,
  userId: string,
  data: ShapeCreateInput,
): Promise<CreateShapeResult> {
  const board = await getBoardById(boardId);
  if (!board) return { ok: false, error: "not_found" };

  const role = await getMemberRole(boardId, userId);
  if (!role || role === "viewer") return { ok: false, error: "forbidden" };

  const shape = await createShape(boardId, userId, data);
  return { ok: true, shape };
}

export type UpdateShapeResult =
  | { ok: true; shape: Awaited<ReturnType<typeof updateShape>> }
  | { ok: false; error: "not_found" | "forbidden" };

export async function updateShapeOnBoard(
  boardId: string,
  shapeId: string,
  userId: string,
  data: ShapeUpdateInput,
): Promise<UpdateShapeResult> {
  const role = await getMemberRole(boardId, userId);
  if (!role || role === "viewer") return { ok: false, error: "forbidden" };

  const existing = await getShapeById(shapeId, boardId);
  if (!existing) return { ok: false, error: "not_found" };

  const shape = await updateShape(shapeId, userId, data);
  return { ok: true, shape };
}

export type DeleteShapeResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "forbidden" };

export async function deleteShapeFromBoard(
  boardId: string,
  shapeId: string,
  userId: string,
): Promise<DeleteShapeResult> {
  const role = await getMemberRole(boardId, userId);
  if (!role || role === "viewer") return { ok: false, error: "forbidden" };

  const existing = await getShapeById(shapeId, boardId);
  if (!existing) return { ok: false, error: "not_found" };

  await deleteShape(shapeId);
  return { ok: true };
}

// ---- Batch upsert (PartyKit persistence sink) ----

export type BatchResult =
  | { ok: true; upserted: number; deleted: number }
  | { ok: false; error: "not_found" | "forbidden" };

export async function batchUpsertForBoard(
  boardId: string,
  userId: string,
  shapes: BatchInput[],
  deletedIds: string[],
): Promise<BatchResult> {
  const board = await getBoardById(boardId);
  if (!board) return { ok: false, error: "not_found" };

  const role = await getMemberRole(boardId, userId);
  if (!role || role === "viewer") return { ok: false, error: "forbidden" };

  await batchUpsertShapes(boardId, userId, shapes, deletedIds);
  return { ok: true, upserted: shapes.length, deleted: deletedIds.length };
}
