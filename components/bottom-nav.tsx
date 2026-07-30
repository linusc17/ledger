"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TABS } from "@/lib/tabs";
import { useTabNavigation } from "@/lib/use-tab-navigation";
import { cn } from "@/lib/cn";

export default function BottomNav() {
  const pathname = usePathname();
  const profile = useQuery(api.profile.get);
  const navigate = useTabNavigation();

  if (pathname.startsWith("/onboarding")) return null;

  const hidden = new Set<string>(profile?.hiddenTabs ?? []);
  const visibleTabs = TABS.filter((t) => !hidden.has(t.href));
  const activeIndex = visibleTabs.findIndex((t) => pathname.startsWith(t.href));

  return (
    <nav className="tab-bar shrink-0 border-t border-border bg-bg/90 backdrop-blur-lg">
      <ul className="relative mx-auto max-w-xl flex items-stretch">
        {activeIndex >= 0 && (
          <span
            aria-hidden="true"
            className="tab-indicator pointer-events-none absolute top-0 h-0.5 rounded-full bg-ink transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{
              width: `${100 / visibleTabs.length}%`,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          />
        )}
        {visibleTabs.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              {/* Stays a real Link so Next keeps prefetching the route and
                  cmd-click still opens a new tab. The handler only takes over
                  the plain-click case, to wrap it in a view transition. */}
              <Link
                href={href}
                // Every route here is dynamic, because the root layout's auth
                // provider reads cookies. Default prefetch defers the whole
                // tree for a dynamic route with no loading boundary, so a tap
                // would block on a full RSC round trip — with the view
                // transition holding a frozen snapshot for the entire wait.
                // Full prefetch caches the payload up front so the navigation
                // commits from memory and the slide can start immediately.
                prefetch={true}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  navigate(href);
                }}
                className={cn(
                  "tap flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors",
                  active ? "text-ink" : "text-muted",
                )}
              >
                <Icon
                  width={20}
                  height={20}
                  strokeWidth={active ? 1.6 : 1.3}
                  className={cn(
                    "transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
                    active && "-translate-y-px scale-110",
                  )}
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" aria-hidden="true" />
    </nav>
  );
}
