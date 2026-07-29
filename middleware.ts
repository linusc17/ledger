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
  "/income",
  "/bills",
  "/spending",
  "/history",
  "/settings",
  "/onboarding",
]);

const passthrough = () => NextResponse.next();

// Without this the auth cookies are session cookies, so they're dropped the
// moment the browsing session ends — which for a home-screen PWA is every time
// iOS evicts the web process. Persisting them keeps you signed in across
// restarts. Matches the year-long session in convex/auth.ts.
const YEAR_SECONDS = 60 * 60 * 24 * 365;

const authed = convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    const ok = await convexAuth.isAuthenticated();
    if (isPublicRoute(request) && ok) {
      return nextjsMiddlewareRedirect(request, "/today");
    }
    if (isSignedInRoute(request) && !ok) {
      return nextjsMiddlewareRedirect(request, "/login");
    }
  },
  { cookieConfig: { maxAge: YEAR_SECONDS } },
);

export default process.env.NEXT_PUBLIC_CONVEX_URL ? authed : passthrough;

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
