import { IconToday, IconIncome, IconBills, IconSpending, IconBalances, IconSettings } from "@/components/icons";

// Order is meaningful: page transitions derive their direction from an index
// comparison, so moving an entry changes which way the app slides.
export const TABS = [
  { href: "/today", label: "Today", Icon: IconToday, hideable: true },
  { href: "/income", label: "Income", Icon: IconIncome, hideable: true },
  { href: "/bills", label: "Bills", Icon: IconBills, hideable: true },
  { href: "/spending", label: "Spending", Icon: IconSpending, hideable: true },
  { href: "/balances", label: "Balances", Icon: IconBalances, hideable: true },
  { href: "/settings", label: "Settings", Icon: IconSettings, hideable: false },
] as const;

// Settings must always stay reachable, so it is the one tab that cannot be hidden.
export const HIDEABLE_TABS = TABS.filter((t) => t.hideable);

export type NavDirection = "forward" | "back";

/**
 * Which way the page should slide when moving between two paths.
 *
 * Anything not in TABS (history, onboarding) sits off the tab strip, so it has
 * no meaningful position; treat entering it as forward and leaving it as back.
 */
export function directionBetween(from: string, to: string): NavDirection {
  const fromIndex = TABS.findIndex((t) => from.startsWith(t.href));
  const toIndex = TABS.findIndex((t) => to.startsWith(t.href));
  if (fromIndex === -1) return "back";
  if (toIndex === -1) return "forward";
  return toIndex > fromIndex ? "forward" : "back";
}
