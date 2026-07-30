import { ImageResponse } from "next/og";

// Matches --bg in globals.css. If those change, these must too — a mismatch
// shows up as a colour flick between the iOS launch image and the app.
const LIGHT = "#faf7f2";
const DARK = "#13100c";

// Large enough for the biggest iPhone (1320x2868) with headroom, small enough
// that a crafted URL cannot ask the renderer for something enormous.
const MAX_EDGE = 4000;

function edge(raw: string | null, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.round(n), 1), MAX_EDGE);
}

/**
 * A solid-colour launch image for iOS home-screen installs.
 *
 * Without one, a standalone PWA paints nothing while iOS boots the web view
 * and waits for the document — and /today cannot return HTML until the auth
 * middleware has checked with Convex. That gap reads as a black screen, and
 * it sits upstream of anything React can render.
 *
 * Deliberately just the background, with no wordmark: the splash draws its own
 * and animates it in, so painting one here too would either double up or jump
 * as static text was replaced by live text in a different renderer's font.
 */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const width = edge(params.get("w"), 1179);
  const height = edge(params.get("h"), 2556);
  const background = params.get("dark") === "1" ? DARK : LIGHT;

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background, display: "flex" }} />,
    { width, height },
  );
}
