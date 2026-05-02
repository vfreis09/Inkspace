import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { boardId } = await params;
    const { email } = await req.json();

    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board || board.ownerId !== userId) {
      return new NextResponse("Unauthorized or Board Not Found", {
        status: 403,
      });
    }

    const client = await clerkClient();
    const users = await client.users.getUserList({ emailAddress: [email] });
    const invitedUser = users.data[0];

    if (!invitedUser) {
      return new NextResponse("User not found in Clerk", { status: 404 });
    }

    await prisma.boardMember.upsert({
      where: {
        boardId_userId: {
          boardId: boardId,
          userId: invitedUser.id,
        },
      },
      update: {
        role: "editor",
      },
      create: {
        boardId: boardId,
        userId: invitedUser.id,
        role: "editor",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Invite error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
