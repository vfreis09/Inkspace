import { prisma } from "@/lib/prisma";

export async function ensureUser(userId: string, email: string, name: string) {
  return prisma.user.upsert({
    where: { email },
    update: { id: userId, name },
    create: { id: userId, email, name },
  });
}