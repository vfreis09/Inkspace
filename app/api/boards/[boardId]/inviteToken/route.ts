import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getMemberRole } from "@/lib/services/board.service";

type Params = { params: Promise<{ boardId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { boardId } = await params;

  const role = await getMemberRole(boardId, userId);
  if (role !== "owner")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { inviteToken: true },
  });

  return Response.json({ inviteToken: board?.inviteToken });
}
