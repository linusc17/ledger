import { NextResponse } from "next/server";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isPublicRoute = createRouteMatcher(["/login", "/setup"]);
const isSignedInRoute = createRouteMatcher([
  "/",
  "/today",
  "/salary",
  "/bills",
  "/history",
  "/settings",
  "/onboarding",
]);

const passthrough = () => NextResponse.next();

const authed = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const ok = await convexAuth.isAuthenticated();
  if (isPublicRoute(request) && ok) {
    return nextjsMiddlewareRedirect(request, "/today");
  }
  if (isSignedInRoute(request) && !ok) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
});

export default process.env.NEXT_PUBLIC_CONVEX_URL ? authed : passthrough;

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
