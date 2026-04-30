import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

//have to change this code in the feature for guest/auth users
const isPublicRoute = createRouteMatcher([
  "/",
  "/board/(.*)",
  "/api/boards/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
