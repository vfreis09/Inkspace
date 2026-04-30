import { NextRequest } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ensureUser } from "@/lib/auth/ensureUser";
import {
  listBoardsForUser,
  createBoardForUser,
} from "@/lib/controllers/board.controller";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const boards = await listBoardsForUser(userId);
  return Response.json(boards);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) return new Response("Unauthorized", { status: 401 });

  const email = user.emailAddresses[0]?.emailAddress || "";
  const name = user.firstName || user.username || "User";
  await ensureUser(userId, email, name);

  const body = await req.json();
  const result = await createBoardForUser(userId, body.name);

  if (!result.ok) {
    return Response.json({ error: "Board name is required" }, { status: 400 });
  }

  return Response.json(result.board, { status: 201 });
}
