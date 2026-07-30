"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { directionBetween } from "@/lib/tabs";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * How long to hold the outgoing frame waiting for the route to commit.
 *
 * startViewTransition freezes the page while its callback settles, so this is
 * a budget for how long the app may appear to hang, not a timeout to be
 * generous with. Routes are prefetched, so a commit normally lands within a
 * frame or two; anything beyond this means a cold cache or a bad connection,
 * and a plain instant navigation beats a frozen screen.
 */
const COMMIT_DEADLINE_MS = 300;

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
  const reduced = useReducedMotion();
  const commitRef = useRef<(() => void) | null>(null);
  const transitionRef = useRef<ViewTransition | null>(null);

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

      if (typeof document.startViewTransition !== "function" || reduced) {
        router.push(href);
        return;
      }

      const root = document.documentElement;
      root.dataset.nav = directionBetween(pathname, href);

      const transition = document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            const timer = window.setTimeout(() => {
              // Drop the animation rather than keep holding the old frame.
              // The navigation still lands; it just lands without a slide.
              transitionRef.current?.skipTransition();
              resolve();
            }, COMMIT_DEADLINE_MS);

            commitRef.current = () => {
              window.clearTimeout(timer);
              resolve();
            };

            router.push(href);
          }),
      );

      // Set before the deadline can fire: startViewTransition runs its callback
      // asynchronously, and the timer is armed inside that callback.
      transitionRef.current = transition;

      void transition.finished.finally(() => {
        delete root.dataset.nav;
      });
    },
    [pathname, router, reduced],
  );
}
