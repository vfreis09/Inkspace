import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  updateShapeOnBoard,
  deleteShapeFromBoard,
} from "@/lib/controllers/shape.controller";

type Params = { params: Promise<{ boardId: string; shapeId: string }> };

function errorToStatus(error: string) {
  return error === "not_found" ? 404 : 403;
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { boardId, shapeId } = await params;
  const body = await req.json();
  const result = await updateShapeOnBoard(boardId, shapeId, userId, body);

  if (!result.ok) {
    const error = result.error;
    if (!error)
      return Response.json({ error: "Unknown error" }, { status: 500 });
    return Response.json({ error }, { status: errorToStatus(error) });
  }

  return Response.json(result.shape);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { boardId, shapeId } = await params;
  const result = await deleteShapeFromBoard(boardId, shapeId, userId);

  if (!result.ok) {
    const error = result.error;
    if (!error)
      return Response.json({ error: "Unknown error" }, { status: 500 });
    return Response.json({ error }, { status: errorToStatus(error) });
  }

  return Response.json({ deleted: true });
}
