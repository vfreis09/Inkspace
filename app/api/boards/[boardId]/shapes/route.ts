import { NextRequest } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/auth/ensureUser";
import {
  listShapesForBoard,
  createShapeOnBoard,
} from "@/lib/controllers/shape.controller";

type Params = { params: Promise<{ boardId: string }> };

async function getAccessStatus(
  boardId: string,
  userId: string | null,
  inviteToken: string | null,
) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { isPublic: true, inviteToken: true, ownerId: true },
  });

  if (!board) return { authorized: false, status: 404 };

  const hasValidToken = inviteToken && board.inviteToken === inviteToken;
  const isOwner = userId && board.ownerId === userId;

  if (board.isPublic || hasValidToken || isOwner) {
    return { authorized: true, board };
  }

  return { authorized: false, status: 403 };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const { userId } = await auth();
  const { boardId } = await params;
  const inviteToken = req.nextUrl.searchParams.get("invite");

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { isPublic: true, inviteToken: true, ownerId: true },
  });

  if (!board) return Response.json({ error: "not_found" }, { status: 404 });

  const isOwner = userId === board.ownerId;
  const hasValidToken = inviteToken && board.inviteToken === inviteToken;

  if (!board.isPublic && !isOwner && !hasValidToken) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const result = await listShapesForBoard(boardId, userId, {
    allowPrivateGuest: Boolean(hasValidToken),
  });

  if (result && result.error) {
    const status = result.error === "forbidden" ? 403 : 400;
    return Response.json({ error: result.error }, { status });
  }

  if (Array.isArray(result)) {
    return Response.json(result);
  }

  return Response.json(result?.shapes || []);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  const { boardId } = await params;
  const inviteToken = req.nextUrl.searchParams.get("invite");

  const access = await getAccessStatus(boardId, userId || null, inviteToken);
  if (!access.authorized)
    return Response.json({ error: "Unauthorized" }, { status: access.status });

  if (userId) {
    const user = await currentUser();
    if (user) {
      const userEmail = user.emailAddresses[0]?.emailAddress || "";
      const userName = user.firstName || user.username || "Unknown User";
      await ensureUser(userId, userEmail, userName);
    }
  }

  const body = await req.json();

  const result = await createShapeOnBoard(boardId, userId || "", body);

  if (!result.ok)
    return Response.json({ error: result.error }, { status: 400 });
  return Response.json(result.shape, { status: 201 });
}
