import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

export async function getSessionIdentity() {
  const { userId } = await auth();
  const user = await currentUser();

  if (userId && user) {
    return {
      id: userId,
      name: user.firstName || user.username || "User",
      isGuest: false,
    };
  }

  const cookieStore = await cookies();
  const guestId = cookieStore.get("guest_id")?.value;
  const guestName = cookieStore.get("guest_name")?.value;

  if (guestId && guestName) {
    return {
      id: guestId,
      name: guestName,
      isGuest: true,
    };
  }

  return null;
}
