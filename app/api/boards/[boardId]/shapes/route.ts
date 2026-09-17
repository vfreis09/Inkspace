import { NextRequest } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/auth/ensureUser";
import {
  listShapesForBoard,
  createShapeOnBoard,
} from "@/lib/controllers/shape.controller";

export async function GET(req: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  const { userId } = await auth();
  const { boardId } = await params;

  const result = await listShapesForBoard(boardId, userId);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.error === "not_found" ? 404 : 403 });
  }
  return Response.json(result.shapes);
}


export async function POST(req: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  const { userId } = await auth();
  const { boardId } = await params;

  if (userId) {
    const user = await currentUser();
    if (user) {
      await ensureUser(userId, user.emailAddresses[0]?.emailAddress || "", user.firstName || user.username || "Unknown User");
    }
  }

  const body = await req.json();
  const result = await createShapeOnBoard(boardId, userId, body);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.error === "not_found" ? 404 : 403 });
  }
  return Response.json(result.shape, { status: 201 });
}