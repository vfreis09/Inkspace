import { NextRequest } from "next/server";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/auth";
import { ensureUser } from "@/lib/auth/ensureUser";
import {
  listBoardsForUser,
  createBoardForUser,
} from "@/lib/controllers/board.controller";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  await ensureUser(userId);

  const boards = await listBoardsForUser(userId);
  return Response.json(boards);
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  await ensureUser(userId);

  const body = await req.json();
  const result = await createBoardForUser(userId, {
    name: body.name,
  });

  if (!result.ok) {
    return Response.json({ error: "Board name is required" }, { status: 400 });
  }

  return Response.json(result.board, { status: 201 });
}
