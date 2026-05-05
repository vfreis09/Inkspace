import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function BoardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ boardId: string }>;
}) {
  const { userId } = await auth();
  const { boardId } = await params;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: {
      isPublic: true,
      ownerId: true,
      members: {
        where: { userId: userId ?? "undefined" },
      },
    },
  });

  if (!board) {
    redirect("/");
  }

  const isOwner = userId ? board.ownerId === userId : false;
  const isMember = board.members.length > 0;
  const canAccess = board.isPublic || isOwner || isMember;

  if (!canAccess && userId) {
    redirect("/");
  }

  return <>{children}</>;
}
