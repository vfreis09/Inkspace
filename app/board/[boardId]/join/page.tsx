import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";
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
    select: { inviteToken: true, inviteRole: true, isPublic: true, name: true },
  });

  if (!board || board.inviteToken !== token) {
    return <InvalidInvitePage />;
  }

  if (!board.isPublic) {
    return <InvalidInvitePage reason="private" />;
  }

  const { userId } = await auth();
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const clerkUser = await (await clerkClient()).users.getUser(userId);
      await prisma.user.create({
        data: {
          id: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
          name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
          avatarUrl: clerkUser.imageUrl,
        },
      });
    }

    await prisma.boardMember.upsert({
      where: { boardId_userId: { boardId, userId } },
      update: {},
      create: { boardId, userId, role: board.inviteRole },
    });
    redirect(`/board/${boardId}`);
  }

  return <GuestJoinPage boardId={boardId} token={token} boardName={board.name} />;
}