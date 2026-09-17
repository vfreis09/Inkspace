import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/board/(.*)",
  "/api/boards/(.*)/shapes(.*)",   // now matches /shapes AND /shapes/batch
  "/api/boards/(.*)/inviteToken",
  "/api/boards/(.*)/party-token",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
