import {
  getShapesByBoardId,
  createShape,
  updateShape,
  deleteShape,
  batchUpsertShapes,
  type ShapeCreateInput,
  type ShapeUpdateInput,
  type BatchInput,
} from "@/lib/services/shape.service";
import { resolveAccess } from "@/lib/services/board.service";
import { createSnapshot, getLatestSnapshotTime } from "../services/snapshot.service";

export async function listShapesForBoard(boardId: string, userId: string | null) {
  const { board, role } = await resolveAccess(boardId, userId);
  if (!board) return { ok: false, error: "not_found" };
  if (!role) return { ok: false, error: "forbidden" };
  const shapes = await getShapesByBoardId(boardId);
  return { ok: true, shapes };
}

export async function createShapeOnBoard(boardId: string, userId: string | null, data: ShapeCreateInput) {
  const { role } = await resolveAccess(boardId, userId);
  if (!role || role === "viewer") return { ok: false, error: "forbidden" };
  const shape = await createShape(boardId, userId ?? "guest", data);
  return { ok: true, shape };
}

export async function updateShapeOnBoard(boardId: string, shapeId: string, userId: string, data: ShapeUpdateInput) {
  const { role } = await resolveAccess(boardId, userId);
  if (!role || role === "viewer") return { ok: false, error: "forbidden" };
  const shape = await updateShape(shapeId, userId, data);
  return { ok: true, shape };
}

export async function deleteShapeFromBoard(boardId: string, shapeId: string, userId: string) {
  const { role } = await resolveAccess(boardId, userId);
  if (!role || role === "viewer") return { ok: false, error: "forbidden" };
  await deleteShape(shapeId);
  return { ok: true };
}
async function snapshotBeforeWrite(boardId: string) {
  try {
    const latest = await getLatestSnapshotTime(boardId);
    if (latest && Date.now() - latest.getTime() < 5 * 60 * 1000) return;
    const current = await getShapesByBoardId(boardId);
    if (current.length > 0) await createSnapshot(boardId, current);
  } catch (err) {
    console.error("Snapshot failed (continuing with the save):", err);
  }
}

export async function batchUpsertForBoard(
  boardId: string,
  userId: string,
  shapes: BatchInput[],
  deletedIds: string[],
  _shouldSnapshot: boolean = false, // ignored now, kept so the route doesn't change
) {
  if (userId !== "system_partykit") {
    const { role } = await resolveAccess(boardId, userId);
    if (!role || role === "viewer") return { ok: false, error: "forbidden" };
  }

  await snapshotBeforeWrite(boardId);
  await batchUpsertShapes(boardId, userId, shapes, deletedIds);

  return { ok: true, upserted: shapes.length, deleted: deletedIds.length };
}