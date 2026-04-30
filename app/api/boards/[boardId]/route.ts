import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getBoardForUser,
  updateBoardForUser,
  deleteBoardForUser,
} from "@/lib/controllers/board.controller";

type RouteParams = { params: Promise<{ boardId: string }> };

function errorToStatus(error: string) {
  return error === "not_found" ? 404 : 403;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { boardId } = await params;
  const result = await getBoardForUser(boardId, userId);

  if (!result.ok) {
    const error = result.error;
    if (!error)
      return NextResponse.json({ error: "Unknown error" }, { status: 500 });
    return NextResponse.json({ error }, { status: errorToStatus(error) });
  }

  return NextResponse.json(result.board);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { boardId } = await params;
  const body = await req.json();
  const result = await updateBoardForUser(boardId, userId, body);

  if (!result.ok) {
    const error = result.error;
    if (!error)
      return Response.json({ error: "Unknown error" }, { status: 500 });
    return Response.json({ error }, { status: errorToStatus(error) });
  }

  return Response.json(result.board);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { boardId } = await params;
  const result = await deleteBoardForUser(boardId, userId);

  if (!result.ok) {
    const error = result.error;
    if (!error)
      return Response.json({ error: "Unknown error" }, { status: 500 });
    return Response.json({ error }, { status: errorToStatus(error) });
  }

  return Response.json({ deleted: true });
}
