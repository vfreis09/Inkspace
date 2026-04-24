import { NextRequest } from "next/server";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/auth";
import {
  listShapesForBoard,
  createShapeOnBoard,
} from "@/lib/controllers/shape.controller";

type Params = { params: Promise<{ boardId: string }> };

function errorToStatus(error: "not_found" | "forbidden") {
  return error === "not_found" ? 404 : 403;
}

export async function GET(req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId(req);
  if (!userId) return unauthorizedResponse();

  const { boardId } = await params;
  const result = await listShapesForBoard(boardId, userId);

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: errorToStatus(result.error) },
    );
  }

  return Response.json(result.shapes);
}

export async function POST(req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId(req);
  if (!userId) return unauthorizedResponse();

  const { boardId } = await params;
  const body = await req.json();
  const result = await createShapeOnBoard(boardId, userId, body);

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: errorToStatus(result.error) },
    );
  }

  return Response.json(result.shape, { status: 201 });
}
