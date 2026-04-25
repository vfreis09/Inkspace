import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function ensureUser(userId: string) {
  const user = await currentUser();

  return prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: user?.emailAddresses[0]?.emailAddress ?? "",
      name: user?.fullName ?? "",
      avatarUrl: user?.imageUrl ?? "",
    },
  });
}
