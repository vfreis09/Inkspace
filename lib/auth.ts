import { NextRequest } from "next/server";

export async function getCurrentUserId(
  req: NextRequest,
): Promise<string | null> {
  // --- TEMPORARY: read user ID from a header for local dev/testing ---
  // When you add Clerk, replace this entire function body with:
  //   const { userId } = await auth();
  //   return userId;
  const devUserId = req.headers.get("x-user-id");
  return devUserId ?? null;
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function notFoundResponse(resource = "Resource") {
  return Response.json({ error: `${resource} not found` }, { status: 404 });
}

export function forbiddenResponse() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}
