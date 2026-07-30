"use client";

import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { todayLocal, monthOf } from "@/lib/date";

/**
 * Holds a live subscription to every tab's data.
 *
 * Tab pages mount and unmount as you navigate, so their queries would start at
 * `undefined` each time and flash skeletons on a tab you already visited. This
 * lives in the layout and therefore never unmounts, keeping the subscriptions
 * open — Convex hands a cached result to any later subscriber of the same
 * query and args synchronously, so pages paint real content on first frame.
 *
 * Args must match the pages exactly. Query args are the cache key, so
 * `{ month: "2026-07" }` and `{ month: "2026-7" }` are different entries and a
 * mismatch silently costs the very skeleton flash this exists to prevent.
 */
export default function WarmQueries() {
  const { isAuthenticated } = useConvexAuth();
  const skip = isAuthenticated ? {} : ("skip" as const);

  const date = todayLocal();
  const month = monthOf(date);

  // Today
  useQuery(api.clients.listMine, skip);
  useQuery(api.logs.forDay, isAuthenticated ? { logDate: date } : "skip");
  useQuery(api.shifts.open, skip);

  // Income
  useQuery(api.pay.listMine, skip);
  useQuery(api.otherIncome.listMonth, isAuthenticated ? { month } : "skip");

  // Bills
  useQuery(api.bills.listTemplates, skip);
  useQuery(api.bills.listPeriods, skip);

  // Spending — only the current month. The month picker is page-local state,
  // and paging back to an older month is a genuine load.
  useQuery(api.spending.listCategories, skip);
  useQuery(api.spending.listMonth, isAuthenticated ? { month } : "skip");
  useQuery(api.spending.monthSummary, isAuthenticated ? { month } : "skip");

  // Balances
  useQuery(api.accounts.summary, skip);

  return null;
}
