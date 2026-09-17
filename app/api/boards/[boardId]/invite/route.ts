import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/auth/ensureUser";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { boardId } = await params;
    const { email, role = "editor" } = await req.json();
    if (!["editor", "viewer"].includes(role)) {
      return new NextResponse("Invalid role", { status: 400 });
    }

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) return new NextResponse("Board not found", { status: 404 });
    if (board.ownerId !== userId) {
      return new NextResponse("Only the owner can invite members", { status: 403 });
    }

    const client = await clerkClient();
    const users = await client.users.getUserList({ emailAddress: [email] });
    const invitedUser = users.data[0];
    if (!invitedUser) return new NextResponse("User not found", { status: 404 });

    if (invitedUser.id === board.ownerId) {
      return new NextResponse("That's you — you're already the owner", { status: 400 });
    }

    await ensureUser(
      invitedUser.id,
      invitedUser.emailAddresses[0]?.emailAddress ?? email,
      invitedUser.firstName || invitedUser.username || "User",
    );

    await prisma.boardMember.upsert({
      where: { boardId_userId: { boardId, userId: invitedUser.id } },
      update: { role },
      create: { boardId, userId: invitedUser.id, role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Invite error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}