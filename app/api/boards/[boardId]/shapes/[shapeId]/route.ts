import { NextRequest } from "next/server";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/auth";
import {
  updateShapeOnBoard,
  deleteShapeFromBoard,
} from "@/lib/controllers/shape.controller";

type Params = { params: Promise<{ boardId: string; shapeId: string }> };

function errorToStatus(error: "not_found" | "forbidden") {
  return error === "not_found" ? 404 : 403;
}

export async function PUT(req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId(req);
  if (!userId) return unauthorizedResponse();

  const { boardId, shapeId } = await params;
  const body = await req.json();
  const result = await updateShapeOnBoard(boardId, shapeId, userId, body);

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: errorToStatus(result.error) },
    );
  }

  return Response.json(result.shape);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId(req);
  if (!userId) return unauthorizedResponse();

  const { boardId, shapeId } = await params;
  const result = await deleteShapeFromBoard(boardId, shapeId, userId);

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: errorToStatus(result.error) },
    );
  }

  return Response.json({ deleted: true });
}
