import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getMemberRole } from "@/lib/services/board.service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getMemberRole(boardId, userId);
  if (role !== "owner") {
    return NextResponse.json({ error: "Only the owner can do this" }, { status: 403 });
  }

  const updated = await prisma.board.update({
    where: { id: boardId },
    data: { inviteToken: crypto.randomUUID() },
  });

  return NextResponse.json({ inviteToken: updated.inviteToken });
}