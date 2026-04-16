"use client";

import { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/cn";
import { daysInMonth, todayLocal } from "@/lib/date";

type Client = Doc<"clients">;
type Log = Doc<"dailyLogs">;

export default function CalendarHeatmap({
  client,
  year,
  month,
  logsForClient,
}: {
  client: Client;
  year: number;
  month: number;
  logsForClient: Log[];
}) {
  const logByDate = new Map<string, Log>();
  for (const l of logsForClient) logByDate.set(l.logDate, l);

  const first = new Date(year, month, 1);
  const firstDow = first.getDay();
  const nDays = daysInMonth(year, month);
  const today = todayLocal();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= nDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const totalTasks = client.dailyTasks.length;

  function isoOf(day: number): string {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="bg-bg-2 rounded-xl p-5">
      <header className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{client.name}</h3>
      </header>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayLabels.map((d, i) => (
          <div key={i} className="text-[10px] text-muted text-center font-medium">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="aspect-square" />;
          const iso = isoOf(day);
          const log = logByDate.get(iso);
          const done = log?.completedTaskIds.filter((id) =>
            client.dailyTasks.some((t) => t.id === id),
          ).length ?? 0;
          const ratio = totalTasks === 0 ? 0 : done / totalTasks;
          const isFuture = iso > today;
          const isToday = iso === today;

          return (
            <div
              key={i}
              className={cn(
                "aspect-square rounded-md flex items-center justify-center text-[11px] font-mono tabular-nums relative",
                isFuture && "opacity-25",
                isToday && "ring-1.5 ring-ink ring-offset-1 ring-offset-bg-2",
                ratio === 1 ? "bg-ink text-bg" :
                ratio > 0.5 ? "bg-ink-soft text-bg" :
                ratio > 0 ? "bg-muted/30 text-ink-soft" :
                "text-muted",
              )}
              title={`${iso}: ${done}/${totalTasks}`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
