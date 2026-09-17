import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { updateMemberRoleForBoard, removeMemberFromBoard } from "@/lib/controllers/board.controller";

type Params = { params: Promise<{ boardId: string; userId: string }> };

function errorToStatus(error: string) {
  if (error === "not_found") return 404;
  if (error === "cannot_change_owner" || error === "cannot_remove_owner") return 400;
  return 403;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId: actingUserId } = await auth();
  if (!actingUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { boardId, userId: targetUserId } = await params;
  const { role } = await req.json();
  if (!["editor", "viewer"].includes(role)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  const result = await updateMemberRoleForBoard(boardId, actingUserId, targetUserId, role);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: errorToStatus(result.error!) });
  return NextResponse.json(result.member);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { userId: actingUserId } = await auth();
  if (!actingUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { boardId, userId: targetUserId } = await params;
  const result = await removeMemberFromBoard(boardId, actingUserId, targetUserId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: errorToStatus(result.error!) });
  return NextResponse.json({ removed: true });
}