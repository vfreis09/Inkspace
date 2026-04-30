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
import { getMemberRole, getBoardById } from "@/lib/services/board.service";

export async function listShapesForBoard(boardId: string, userId: string) {
  const role = await getMemberRole(boardId, userId);
  if (!role) return { ok: false, error: "forbidden" };

  const shapes = await getShapesByBoardId(boardId);
  return { ok: true, shapes };
}

export async function createShapeOnBoard(
  boardId: string,
  userId: string,
  data: ShapeCreateInput,
) {
  const role = await getMemberRole(boardId, userId);
  if (!role || role === "viewer") return { ok: false, error: "forbidden" };

  const shape = await createShape(boardId, userId, data);
  return { ok: true, shape };
}

export async function updateShapeOnBoard(
  boardId: string,
  shapeId: string,
  userId: string,
  data: ShapeUpdateInput,
) {
  const role = await getMemberRole(boardId, userId);
  if (!role || role === "viewer") return { ok: false, error: "forbidden" };

  const shape = await updateShape(shapeId, userId, data);
  return { ok: true, shape };
}

export async function deleteShapeFromBoard(
  boardId: string,
  shapeId: string,
  userId: string,
) {
  const role = await getMemberRole(boardId, userId);
  if (!role || role === "viewer") return { ok: false, error: "forbidden" };

  await deleteShape(shapeId);
  return { ok: true };
}

export async function batchUpsertForBoard(
  boardId: string,
  userId: string,
  shapes: BatchInput[],
  deletedIds: string[],
) {
  if (userId !== "system_partykit") {
    const role = await getMemberRole(boardId, userId);
    if (!role || role === "viewer") return { ok: false, error: "forbidden" };
  }

  await batchUpsertShapes(boardId, userId, shapes, deletedIds);
  return { ok: true, upserted: shapes.length, deleted: deletedIds.length };
}
