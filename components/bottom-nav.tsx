"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { IconToday, IconIncome, IconBills, IconSpending, IconSettings } from "./icons";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/today", label: "Today", Icon: IconToday },
  { href: "/income", label: "Income", Icon: IconIncome },
  { href: "/bills", label: "Bills", Icon: IconBills },
  { href: "/spending", label: "Spending", Icon: IconSpending },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

export const HIDEABLE_TABS = ["/today", "/income", "/bills", "/spending"] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const profile = useQuery(api.profile.get);

  if (pathname.startsWith("/onboarding")) return null;

  const hidden = new Set(profile?.hiddenTabs ?? []);
  const visibleTabs = tabs.filter((t) => !hidden.has(t.href));

  return (
    <nav className="shrink-0 border-t border-border bg-bg/90 backdrop-blur-lg">
      <ul className="mx-auto max-w-xl flex items-stretch">
        {visibleTabs.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors",
                  active ? "text-ink" : "text-muted",
                )}
              >
                <Icon width={20} height={20} strokeWidth={active ? 1.6 : 1.3} />
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
