import { NextRequest } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  listShapesForBoard,
  createShapeOnBoard,
} from "@/lib/controllers/shape.controller";
import { ensureUser } from "@/lib/auth/ensureUser";

type Params = { params: Promise<{ boardId: string }> };

function errorToStatus(error: string) {
  return error === "not_found" ? 404 : 403;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userEmail = user.emailAddresses[0]?.emailAddress || "";
  const userName = user.firstName || user.username || "Unknown User";
  await ensureUser(userId, userEmail, userName);

  const { boardId } = await params;

  const result = await listShapesForBoard(boardId, userId);

  if (!result.ok) {
    const error = result.error;
    if (!error)
      return Response.json({ error: "Unknown error" }, { status: 500 });
    return Response.json({ error }, { status: errorToStatus(error) });
  }

  return Response.json(result.shapes);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userEmail = user.emailAddresses[0]?.emailAddress || "";
  const userName = user.firstName || user.username || "Unknown User";
  await ensureUser(userId, userEmail, userName);

  const { boardId } = await params;
  const body = await req.json();

  const result = await createShapeOnBoard(boardId, userId, body);

  if (!result.ok) {
    const error = result.error;
    if (!error)
      return Response.json({ error: "Unknown error" }, { status: 500 });
    return Response.json({ error }, { status: errorToStatus(error) });
  }

  return Response.json(result.shape, { status: 201 });
}
