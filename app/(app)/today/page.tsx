"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { todayLocal, formatLong } from "@/lib/date";
import ClientCard from "@/components/client-card";
import { SkeletonList } from "@/components/skeleton";
import { useMemo } from "react";

export default function TodayPage() {
  const date = todayLocal();
  const clients = useQuery(api.clients.listMine);
  const logs = useQuery(api.logs.forDay, { logDate: date });

  const logByClient = useMemo(() => {
    const m = new Map<string, Doc<"dailyLogs">>();
    (logs ?? []).forEach((l) => m.set(l.clientId, l));
    return m;
  }, [logs]);

  const totals = useMemo(() => {
    if (!clients) return { total: 0, done: 0 };
    let total = 0;
    let done = 0;
    for (const c of clients) {
      total += c.dailyTasks.length;
      const log = logByClient.get(c._id);
      const d = log?.completedTaskIds ?? [];
      done += c.dailyTasks.filter((t) => d.includes(t.id)).length;
    }
    return { total, done };
  }, [clients, logByClient]);

  const pct = totals.total === 0 ? 0 : (totals.done / totals.total) * 100;
  const allDone = totals.total > 0 && totals.done === totals.total;

  return (
    <main className="mx-auto max-w-xl px-5 pt-6 sm:px-8 sm:pt-10">
      <header className="flex items-baseline justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{formatLong(date)}</h1>
          <p className="text-sm text-muted mt-1">
            {clients === undefined
              ? "Loading…"
              : clients.length === 0
                ? "No clients yet"
                : `${totals.done}/${totals.total} tasks done`}
            {allDone && <span className="text-success ml-2">All done ✓</span>}
          </p>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">Today</span>
      </header>

      {clients && clients.length > 0 && (
        <div className="h-1 bg-bg-2 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-ink rounded-full transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <section className="space-y-6">
        {clients?.map((client, i) => (
          <ClientCard
            key={client._id}
            client={client}
            log={logByClient.get(client._id)}
            logDate={date}
            index={i}
          />
        ))}
      </section>

      {clients === undefined && <SkeletonList />}
    </main>
  );
}
