import { NextRequest } from "next/server";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/auth";
import {
  getBoardForUser,
  updateBoardForUser,
  deleteBoardForUser,
} from "@/lib/controllers/board.controller";
import { ensureUser } from "@/lib/auth/ensureUser";

type Params = { params: Promise<{ boardId: string }> };

function errorToStatus(error: "not_found" | "forbidden") {
  return error === "not_found" ? 404 : 403;
}

export async function GET(req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  const { boardId } = await params;
  const result = await getBoardForUser(boardId, userId);

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: errorToStatus(result.error) },
    );
  }

  return Response.json(result.board);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();
  await ensureUser(userId);

  const { boardId } = await params;
  const body = await req.json();
  const result = await updateBoardForUser(boardId, userId, body);

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: errorToStatus(result.error) },
    );
  }

  return Response.json(result.board);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  const { boardId } = await params;
  const result = await deleteBoardForUser(boardId, userId);

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: errorToStatus(result.error) },
    );
  }

  return Response.json({ deleted: true });
}
