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

  if (!userId) {
    redirect("/sign-in");
  }

  const { boardId } = await params;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { members: true },
  });

  if (!board) {
    redirect("/");
  }

  const isOwner = board.ownerId === userId;
  const isMember = board.members.some((member) => member.userId === userId);

  if (!isOwner && !isMember) {
    redirect("/");
  }

  return <>{children}</>;
}
