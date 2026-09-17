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
    select: {
      id: true,
      name: true,
      isPublic: true,
      thumbnail: true,
      createdAt: true,
      updatedAt: true,
      ownerId: true,
      inviteRole: true,
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

export async function createBoard(userId: string, name: string, isPublic: boolean) {
  return prisma.board.create({
    data: {
      name: name.trim(),
      ownerId: userId,
      isPublic,
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
  data: { name?: string; thumbnail?: string; isPublic?: boolean; inviteRole?: BoardRole },
) {
  return prisma.board.update({
    where: { id: boardId },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.thumbnail && { thumbnail: data.thumbnail }),
      ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
      ...(data.inviteRole && { inviteRole: data.inviteRole }),
    },
  });
}

export async function deleteBoard(boardId: string) {
  return prisma.board.delete({ where: { id: boardId } });
}

export async function getBoardAccessInfo(boardId: string) {
  return prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true, ownerId: true, isPublic: true, inviteToken: true, inviteRole: true },
  });
}

export async function resolveAccess(boardId: string, userId: string | null) {
  const board = await getBoardAccessInfo(boardId);
  if (!board) return { board: null, role: null as BoardRole | null };

  if (userId) {
    const role = await getMemberRole(boardId, userId);
    if (role) return { board, role };
    // Not an explicit member: on a public board they still get the link's role
    if (board.isPublic) return { board, role: board.inviteRole };
    return { board, role: null };
  }

  // Unauthenticated guest
  if (board.isPublic) return { board, role: board.inviteRole };
  return { board, role: null }; // private boards: no guest access, period
}

export async function updateMemberRole(boardId: string, userId: string, role: BoardRole) {
  return prisma.boardMember.update({
    where: { boardId_userId: { boardId, userId } },
    data: { role },
  });
}

export async function removeMember(boardId: string, userId: string) {
  return prisma.boardMember.delete({ where: { boardId_userId: { boardId, userId } } });
}
