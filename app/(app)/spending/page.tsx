"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { IconPlus, IconArrow } from "@/components/icons";
import { todayLocal, formatShort, formatMonth } from "@/lib/date";
import { peso, pesoZero } from "@/lib/currency";
import { SkeletonList } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { SpendDonut } from "@/components/spend-donut";
import { SpendDrawer, type SpendEditorState } from "./SpendDrawer";

const CATEGORY_LABELS = {
  needed: "Needed",
  unnecessary: "Unnecessary",
  other: "Other",
} as const;

const CATEGORY_DOT = {
  needed: "bg-[var(--success)]",
  unnecessary: "bg-[var(--accent)]",
  other: "bg-[var(--muted)]",
} as const;

function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

function shiftMonth(monthIso: string, delta: number): string {
  const [y, m] = monthIso.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function SpendingPage() {
  const [month, setMonth] = useState<string>(monthOf(todayLocal()));
  const [editor, setEditor] = useState<SpendEditorState>({ mode: "closed" });

  const entries = useQuery(api.spending.listMonth, { month });
  const summary = useQuery(api.spending.monthSummary, { month });

  const createEntry = useMutation(api.spending.create);
  const updateEntry = useMutation(api.spending.update);
  const removeEntry = useMutation(api.spending.remove);

  const currentMonth = monthOf(todayLocal());
  const atCurrent = month === currentMonth;

  const grouped = useMemo(() => {
    const map = new Map<string, Doc<"spendEntries">[]>();
    for (const e of entries ?? []) {
      const list = map.get(e.entryDate) ?? [];
      list.push(e);
      map.set(e.entryDate, list);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [entries]);

  const loading = entries === undefined || summary === undefined;

  async function handleSave(data: {
    entryDate: string;
    category: "needed" | "unnecessary" | "other";
    amount: number;
    note?: string;
  }) {
    if (editor.mode === "create") {
      await createEntry(data);
    } else if (editor.mode === "edit") {
      await updateEntry({ entryId: editor.entry._id, ...data });
    }
    setEditor({ mode: "closed" });
  }

  async function handleDelete(id: Doc<"spendEntries">["_id"]) {
    await removeEntry({ entryId: id });
    setEditor({ mode: "closed" });
  }

  return (
    <main className="mx-auto max-w-xl px-5 pt-6 sm:px-8 sm:pt-10">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Spending</h1>
        <button
          type="button"
          onClick={() => setEditor({ mode: "create" })}
          aria-label="Add spend"
          className="flex items-center justify-center size-9 rounded-full bg-card text-ink hover:opacity-80 transition-opacity"
        >
          <IconPlus width={18} height={18} strokeWidth={1.6} />
        </button>
      </header>

      <div className="mb-6 flex items-center justify-between bg-bg-2 rounded-xl px-3 py-2">
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          aria-label="Previous month"
          className="size-8 flex items-center justify-center text-muted hover:text-foreground transition-colors"
        >
          <IconArrow width={14} height={14} strokeWidth={1.5} className="rotate-180" />
        </button>
        <span className="text-sm font-medium">
          {formatMonth(`${month}-01`)}
        </span>
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          disabled={atCurrent}
          aria-label="Next month"
          className="size-8 flex items-center justify-center text-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <IconArrow width={14} height={14} strokeWidth={1.5} />
        </button>
      </div>

      {loading ? (
        <SkeletonList />
      ) : (
        <>
          <section className="fade-in mb-6 bg-card rounded-xl p-5 flex flex-col items-center">
            <SpendDonut
              byCategory={summary.byCategory}
              total={summary.spending}
              className="mb-4"
            />
            <ul className="w-full max-w-xs space-y-1.5">
              {(["needed", "unnecessary", "other"] as const).map((k) => (
                <li key={k} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={cn("size-2.5 rounded-full", CATEGORY_DOT[k])} />
                    {CATEGORY_LABELS[k]}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {pesoZero(summary.byCategory[k])}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="fade-in fade-in-1 mb-8 bg-card rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Saved this month</p>
            <p
              className={cn(
                "text-3xl font-semibold tabular-nums mb-4",
                summary.saved >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {pesoZero(summary.saved)}
            </p>
            <ul className="space-y-1 text-sm tabular-nums">
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">+ Income</span>
                <span>{pesoZero(summary.income)}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">− Bills</span>
                <span>{pesoZero(summary.billsPaid)}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">− Spending</span>
                <span>{pesoZero(summary.spending)}</span>
              </li>
            </ul>
          </section>

          <section className="fade-in fade-in-2 mb-8">
            {grouped.length === 0 ? (
              <EmptyEntries onAdd={() => setEditor({ mode: "create" })} />
            ) : (
              grouped.map(([date, rows]) => (
                <div key={date} className="mb-5">
                  <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
                    {formatShort(date)}
                  </h3>
                  <ul className="bg-card rounded-xl divide-y divide-border/30">
                    {rows.map((e) => (
                      <li key={e._id}>
                        <button
                          type="button"
                          onClick={() => setEditor({ mode: "edit", entry: e })}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:opacity-80 transition-opacity"
                        >
                          <span
                            className={cn("size-2.5 rounded-full shrink-0", CATEGORY_DOT[e.category])}
                          />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium">
                              {CATEGORY_LABELS[e.category]}
                            </span>
                            {e.note && (
                              <span className="block text-xs text-muted-foreground truncate">
                                {e.note}
                              </span>
                            )}
                          </span>
                          <span className="text-sm tabular-nums">{peso(e.amount)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>
        </>
      )}

      <SpendDrawer
        state={editor}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => setEditor({ mode: "closed" })}
      />
    </main>
  );
}

function EmptyEntries({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <p className="text-muted">No entries this month.</p>
      <Button size="lg" onClick={onAdd}>
        <IconPlus width={14} height={14} strokeWidth={1.6} />
        Log a spend
      </Button>
    </div>
  );
}
