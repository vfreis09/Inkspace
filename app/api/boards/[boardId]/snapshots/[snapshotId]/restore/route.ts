import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { restoreSnapshotForBoard } from "@/lib/controllers/snapshot.controller";

function errorToStatus(error: string) {
  if (error === "not_found") return 404;
  return 403;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string; snapshotId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { boardId, snapshotId } = await params;
  const result = await restoreSnapshotForBoard(boardId, snapshotId, userId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: errorToStatus(result.error!) });
  }

  return NextResponse.json({ ok: true, shapes: result.shapes });
}