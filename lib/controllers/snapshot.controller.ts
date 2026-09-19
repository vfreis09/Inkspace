import { getMemberRole } from "@/lib/services/board.service";
import {
  getSnapshotsByBoardId,
  getSnapshotById,
} from "@/lib/services/snapshot.service";
import { prisma } from "@/lib/prisma";

export async function listSnapshotsForBoard(boardId: string, userId: string) {
  const role = await getMemberRole(boardId, userId);
  if (role !== "owner") return { ok: false, error: "forbidden" };

  const snapshots = await getSnapshotsByBoardId(boardId);
  return { ok: true, snapshots };
}

export async function restoreSnapshotForBoard(
  boardId: string,
  snapshotId: string,
  userId: string,
) {
  const role = await getMemberRole(boardId, userId);
  if (role !== "owner") return { ok: false, error: "forbidden" };

  const snapshot = await getSnapshotById(snapshotId);
  if (!snapshot || snapshot.boardId !== boardId) {
    return { ok: false, error: "not_found" };
  }

  const restoredShapes = snapshot.shapesJson as any[];

  // Replace current shapes with the snapshot's contents, in one transaction
  await prisma.$transaction([
    prisma.shape.deleteMany({ where: { boardId } }),
    prisma.shape.createMany({
      data: restoredShapes.map((s) => ({ ...s, boardId })),
    }),
  ]);

  const partyHost = process.env.PARTYKIT_HOST || "http://localhost:1999";
  try {
    await fetch(`${partyHost}/parties/main/${boardId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-partykit-secret": process.env.PARTYKIT_SECRET || "development_secret",
      },
      body: JSON.stringify({ shapes: restoredShapes }),
    });
  } catch (err) {
    console.error("Failed to push restore to PartyKit:", err);
  }

  return { ok: true, shapes: restoredShapes };
}