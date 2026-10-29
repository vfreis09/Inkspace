import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const MAX_SNAPSHOTS_PER_BOARD = 20;

export async function createSnapshot(
  boardId: string,
  shapes: Prisma.InputJsonValue,
) {
  const snapshot = await prisma.boardSnapshot.create({
    data: {
      boardId,
      shapesJson: shapes,
    },
  });

  await pruneOldSnapshots(boardId);

  return snapshot;
}

export async function getSnapshotsByBoardId(boardId: string) {
  return prisma.boardSnapshot.findMany({
    where: { boardId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true }, // don't fetch shapesJson for the list view — could be large
  });
}

export async function getSnapshotById(snapshotId: string) {
  return prisma.boardSnapshot.findUnique({
    where: { id: snapshotId },
  });
}

async function pruneOldSnapshots(boardId: string) {
  const all = await prisma.boardSnapshot.findMany({
    where: { boardId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
    skip: MAX_SNAPSHOTS_PER_BOARD,
  });

  if (all.length === 0) return;
  
  await prisma.boardSnapshot.deleteMany({
    where: { id: { in: all.map((s) => s.id) } },
  });
}