"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconToday, IconSalary, IconHistory, IconSettings } from "./icons";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/today", label: "Today", Icon: IconToday },
  { href: "/salary", label: "Salary", Icon: IconSalary },
  { href: "/history", label: "History", Icon: IconHistory },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/onboarding")) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-bg/90 backdrop-blur-lg">
      <ul className="mx-auto max-w-xl flex items-stretch">
        {tabs.map(({ href, label, Icon }) => {
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
