import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GuestJoinPage } from "@/features/boards/components/GuestJoinPage/GuestJoinPage";
import { InvalidInvitePage } from "@/features/boards/components/InvalidInvitePage/InvalidInvitePage";

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ boardId: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { boardId } = await params;
  const { invite } = await searchParams;
  const token = invite;

  if (!token) redirect(`/board/${boardId}`);

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { inviteToken: true, name: true },
  });

  if (!board || board.inviteToken !== token) {
    return <InvalidInvitePage />;
  }

  const { userId } = await auth();
  if (userId) {
    await prisma.boardMember.upsert({
      where: { boardId_userId: { boardId, userId } },
      update: { role: "editor" },
      create: { boardId, userId, role: "editor" },
    });
    redirect(`/board/${boardId}`);
  }

  return (
    <GuestJoinPage boardId={boardId} token={token} boardName={board.name} />
  );
}
