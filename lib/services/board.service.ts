import { prisma } from "@/lib/prisma";
import type { BoardRole } from "@prisma/client";

export async function getBoardsByUserId(userId: string) {
  return prisma.board.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
      _count: { select: { shapes: true } },
    },
  });
}

export async function getBoardById(boardId: string) {
  return prisma.board.findUnique({
    where: { id: boardId },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });
}

export async function getMemberRole(
  boardId: string,
  userId: string,
): Promise<BoardRole | null> {
  const member = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId } },
  });
  return member?.role ?? null;
}

export async function createBoard(userId: string, name: string) {
  return prisma.board.create({
    data: {
      name: name.trim(),
      ownerId: userId,
      members: {
        create: { userId, role: "owner" },
      },
    },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { shapes: true } },
    },
  });
}

export async function updateBoard(
  boardId: string,
  data: { name?: string; thumbnail?: string },
) {
  return prisma.board.update({
    where: { id: boardId },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.thumbnail && { thumbnail: data.thumbnail }),
    },
  });
}

export async function deleteBoard(boardId: string) {
  return prisma.board.delete({ where: { id: boardId } });
}
