import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ boardId: string }>;
};

export async function POST(req: NextRequest, { params }: Params) {
  const { boardId } = await params;
  const { inviteToken } = await req.json();

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { inviteToken: true, isPublic: true },
  });

  if (!board || board.inviteToken !== inviteToken) {
    return Response.json({ error: "Invalid invite link" }, { status: 403 });
  }

  const { userId } = await auth();
  if (userId) {
    await prisma.boardMember.upsert({
      where: { boardId_userId: { boardId, userId } },
      update: { role: "editor" },
      create: { boardId, userId, role: "editor" },
    });
  }

  return Response.json({ ok: true, granted: true });
}
