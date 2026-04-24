import { NextRequest } from "next/server";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/auth";
import { batchUpsertForBoard } from "@/lib/controllers/shape.controller";

type Params = { params: Promise<{ boardId: string }> };

function errorToStatus(error: "not_found" | "forbidden") {
  return error === "not_found" ? 404 : 403;
}

export async function PUT(req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId(req);
  if (!userId) return unauthorizedResponse();

  const { boardId } = await params;
  const body = await req.json();

  const shapes = body.shapes ?? [];
  const deletedIds = body.deletedIds ?? [];

  const result = await batchUpsertForBoard(boardId, userId, shapes, deletedIds);

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: errorToStatus(result.error) },
    );
  }

  return Response.json({
    ok: true,
    upserted: result.upserted,
    deleted: result.deleted,
  });
}
