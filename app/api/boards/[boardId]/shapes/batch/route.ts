import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isPartyKitRequest } from "@/lib/auth";
import { batchUpsertForBoard } from "@/lib/controllers/shape.controller";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const { boardId } = await params;
  const body = await req.json();
  const { shapes = [], deletedIds = [] } = body;

  let executorId: string | null = null;

  if (isPartyKitRequest(req)) {
    executorId = "system_partykit";
  } else {
    const { userId } = await auth();
    executorId = userId;
  }

  if (!executorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await batchUpsertForBoard(
    boardId,
    executorId,
    shapes,
    deletedIds,
  );

  if (!result.ok) {
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
