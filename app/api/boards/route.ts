import { NextRequest } from "next/server";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/auth";
import {
  listBoardsForUser,
  createBoardForUser,
} from "@/lib/controllers/board.controller";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return unauthorizedResponse();

  const boards = await listBoardsForUser(userId);
  return Response.json(boards);
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return unauthorizedResponse();

  const body = await req.json();
  const result = await createBoardForUser(userId, {
    name: body.name,
    email: body.email,
  });

  if (!result.ok) {
    return Response.json({ error: "Board name is required" }, { status: 400 });
  }

  return Response.json(result.board, { status: 201 });
}
