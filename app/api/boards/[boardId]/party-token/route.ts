import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { resolveAccess } from "@/lib/services/board.service";
import { signPartyToken } from "@/lib/partyToken";

export async function GET(req: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  const { userId } = await auth();

  const { board, role } = await resolveAccess(boardId, userId);
  if (!board) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!role) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const secret = process.env.PARTYKIT_SECRET || "development_secret";
  const token = await signPartyToken({ boardId, userId: userId ?? null, role }, secret);

  return NextResponse.json({ token, role });
}