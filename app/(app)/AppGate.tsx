"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { todayLocal } from "@/lib/date";
import { cn } from "@/lib/cn";

/**
 * How long the splash may hold before giving up and revealing the app anyway.
 *
 * Past this point something is wrong — no signal, a cold Convex connection —
 * and the skeletons underneath are a better answer than a splash that looks
 * hung. Never let this screen become a place the app can get stuck.
 */
const MAX_HOLD_MS = 2500;

// Long enough that a fast start never shows it, short enough that a slow one
// doesn't look frozen.
const SPINNER_AFTER_MS = 600;

/**
 * Holds a splash over the app until the first screen can render with content.
 *
 * Queries cannot even begin until Convex finishes its auth handshake, because
 * they are all gated on `isAuthenticated`. That serialization means a cold open
 * would otherwise show the Today header above empty skeletons for a beat before
 * everything popped in. This covers that gap with something deliberate.
 *
 * It gates on the first screen only. Waiting for every tab would let the
 * slowest query anywhere in the app decide how long you stare at a logo.
 */
export default function AppGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? {} : ("skip" as const);

  // Deliberately the same queries WarmQueries holds. Convex dedupes identical
  // subscriptions, so this costs nothing and keeps the two jobs separate:
  // WarmQueries keeps data warm, this decides when the app is ready to show.
  const profile = useQuery(api.profile.get, args);
  const clients = useQuery(api.clients.listMine, args);
  const logs = useQuery(api.logs.forDay, isAuthenticated ? { logDate: todayLocal() } : "skip");
  const shifts = useQuery(api.shifts.open, args);

  // Profile is included so OnboardingGuard has decided whether to redirect
  // before the reveal — otherwise a first-run open flashes Today, then jumps.
  const dataReady =
    !isLoading &&
    isAuthenticated &&
    profile !== undefined &&
    clients !== undefined &&
    logs !== undefined &&
    shifts !== undefined;

  const [expired, setExpired] = useState(false);
  const [slow, setSlow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const giveUp = window.setTimeout(() => setExpired(true), MAX_HOLD_MS);
    const showSpinner = window.setTimeout(() => setSlow(true), SPINNER_AFTER_MS);
    return () => {
      window.clearTimeout(giveUp);
      window.clearTimeout(showSpinner);
    };
  }, []);

  // Latched during render rather than in an effect: an effect would paint one
  // frame of the splash after it should already be leaving.
  if (!revealed && (dataReady || expired)) {
    setRevealed(true);
  }

  return (
    <>
      {children}
      {!dismissed && (
        <div
          className={cn("splash", revealed && "splash-out")}
          // animationend bubbles, so the wordmark's own entrance and the dots'
          // pulse would both land here and tear the splash down early.
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget && revealed) setDismissed(true);
          }}
          aria-hidden={revealed}
          role="status"
          aria-label="Loading Tally"
        >
          <div className="splash-mark">
            <span className="text-2xl font-semibold tracking-tight">Tally</span>
            <span className={cn("splash-dots", slow && !revealed && "splash-dots-in")} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
        </div>
      )}
    </>
  );
}
