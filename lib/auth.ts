import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

export function isPartyKitRequest(req: NextRequest): boolean {
  return req.headers.get("x-partykit-secret") === process.env.PARTYKIT_SECRET;
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
