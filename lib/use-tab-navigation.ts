"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { directionBetween } from "@/lib/tabs";

// If the route never commits (a failed navigation, a redirect back to where we
// started) the transition promise would hang and the browser would hold the
// frozen snapshot until its own 4s timeout. Cut it loose well before that.
const COMMIT_TIMEOUT_MS = 1000;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Navigate between tabs with a directional page transition.
 *
 * The transition is driven by the browser's View Transitions API rather than
 * React's `<ViewTransition>`: Next exposes `experimental.viewTransition`, but
 * React 19.2 stable ships no such component, so that path would require a
 * React experimental build.
 */
export function useTabNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const commitRef = useRef<(() => void) | null>(null);

  const commit = useCallback(() => {
    commitRef.current?.();
    commitRef.current = null;
  }, []);

  // The route has actually changed, so the transition may capture the new frame.
  useEffect(() => {
    commit();
  }, [pathname, commit]);

  // Never leave a pending transition behind on unmount.
  useEffect(() => commit, [commit]);

  return useCallback(
    (href: string) => {
      const isCurrent = pathname === href || pathname.startsWith(`${href}/`);
      if (isCurrent) return;

      if (typeof document.startViewTransition !== "function" || prefersReducedMotion()) {
        router.push(href);
        return;
      }

      const root = document.documentElement;
      root.dataset.nav = directionBetween(pathname, href);

      const transition = document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            const timer = window.setTimeout(resolve, COMMIT_TIMEOUT_MS);
            commitRef.current = () => {
              window.clearTimeout(timer);
              resolve();
            };
            router.push(href);
          }),
      );

      void transition.finished.finally(() => {
        delete root.dataset.nav;
      });
    },
    [pathname, router],
  );
}
