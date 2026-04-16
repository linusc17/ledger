"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo, useState } from "react";
import CalendarHeatmap from "@/components/calendar-heatmap";
import { IconArrow } from "@/components/icons";
import { SkeletonList } from "@/components/skeleton";
import { todayLocal } from "@/lib/date";

export default function HistoryPage() {
  const today = new Date(todayLocal() + "T00:00:00");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const clients = useQuery(api.clients.listMine);
  const logs = useQuery(api.logs.forRange, { startDate, endDate });

  const logsByClient = useMemo(() => {
    const m = new Map<string, typeof logs>();
    for (const log of logs ?? []) {
      const arr = m.get(log.clientId) ?? [];
      arr.push(log);
      m.set(log.clientId, arr);
    }
    return m;
  }, [logs]);

  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  function prev() {
    const d = new Date(year, month - 1, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }
  function next() {
    const d = new Date(year, month + 1, 1);
    if (d > new Date()) return;
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <main className="mx-auto max-w-xl px-5 pt-6 sm:px-8 sm:pt-10">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{monthLabel}</h1>
          <p className="text-sm text-muted mt-1">Completion history</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prev}
            className="p-2 text-muted hover:text-ink transition-colors rounded-lg hover:bg-bg-2"
          >
            <IconArrow width={16} height={16} className="rotate-180" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={next}
            disabled={isCurrentMonth}
            className="p-2 text-muted hover:text-ink transition-colors rounded-lg hover:bg-bg-2 disabled:opacity-30"
          >
            <IconArrow width={16} height={16} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <section className="fade-in space-y-6">
        {clients === undefined ? (
          <SkeletonList count={3} />
        ) : clients.length === 0 ? (
          <p className="text-center text-muted py-16">No clients yet.</p>
        ) : (
          clients.map((c) => (
            <CalendarHeatmap
              key={c._id}
              client={c}
              year={year}
              month={month}
              logsForClient={logsByClient.get(c._id) ?? []}
            />
          ))
        )}
      </section>
    </main>
  );
}
