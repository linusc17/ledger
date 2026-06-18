"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { IconPlus, IconSettings } from "@/components/icons";
import { peso, pesoZero } from "@/lib/currency";
import { todayLocal, parseLocal } from "@/lib/date";
import { SkeletonList } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { ReconcileDrawer } from "./ReconcileDrawer";
import { ManageAccountsDrawer } from "./ManageAccountsDrawer";

function daysBetween(fromIso: string, toIso: string): number {
  const ms = parseLocal(toIso).getTime() - parseLocal(fromIso).getTime();
  return Math.round(ms / 86_400_000);
}

function lastCheckedLabel(iso: string | null): string {
  if (!iso) return "Never checked";
  const d = daysBetween(iso, todayLocal());
  if (d <= 0) return "Checked today";
  if (d === 1) return "Checked yesterday";
  return `Checked ${d} days ago`;
}

export default function BalancesPage() {
  const summary = useQuery(api.accounts.summary);
  const reconcile = useMutation(api.accounts.reconcile);
  const createAccount = useMutation(api.accounts.createAccount);
  const updateAccount = useMutation(api.accounts.updateAccount);
  const archiveAccount = useMutation(api.accounts.archiveAccount);

  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const loading = summary === undefined;
  const accounts = summary?.accounts ?? [];
  const hasAccounts = accounts.length > 0;

  return (
    <main className="mx-auto max-w-xl px-5 pt-6 sm:px-8 sm:pt-10">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Balances</h1>
        <button
          type="button"
          onClick={() => setManageOpen(true)}
          aria-label="Manage accounts"
          className="flex items-center justify-center size-9 rounded-full bg-card text-ink hover:opacity-80 transition-opacity"
        >
          <IconSettings width={16} height={16} strokeWidth={1.5} />
        </button>
      </header>

      {loading ? (
        <SkeletonList />
      ) : !hasAccounts ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <p className="text-muted max-w-[260px]">
            Add your accounts and their current balances. Then check in now and then —
            we&rsquo;ll catch any spending you forgot to log.
          </p>
          <Button size="lg" onClick={() => setManageOpen(true)}>
            <IconPlus width={14} height={14} strokeWidth={1.6} />
            Add an account
          </Button>
        </div>
      ) : (
        <>
          <section className="fade-in mb-6 bg-card rounded-xl p-5 text-center">
            <p className="text-xs text-muted-foreground mb-1">Net worth</p>
            <p className="text-4xl font-semibold tabular-nums mb-2">{pesoZero(summary!.netWorth)}</p>
            <p className="text-xs text-muted-foreground">{lastCheckedLabel(summary!.lastCheckDate)}</p>
          </section>

          {summary!.expectedDelta !== 0 && (
            <section className="fade-in fade-in-1 mb-6 bg-bg-2 rounded-xl px-4 py-3 text-sm text-muted-foreground">
              Since your last check you&rsquo;ve logged a net{" "}
              <span className={cn("font-medium", summary!.expectedDelta >= 0 ? "text-success" : "text-destructive")}>
                {pesoZero(summary!.expectedDelta)}
              </span>
              . Update your balances to see what&rsquo;s really left.
            </section>
          )}

          <section className="fade-in fade-in-2 mb-6">
            <ul className="bg-card rounded-xl divide-y divide-border/30">
              {accounts.map((a) => (
                <li key={a._id} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="size-2.5 rounded-full shrink-0" style={{ background: a.color }} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium">{a.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {lastCheckedLabel(a.balanceUpdatedAt)}
                    </span>
                  </span>
                  <span className="text-sm tabular-nums">{peso(a.currentBalance)}</span>
                </li>
              ))}
            </ul>
          </section>

          <Button size="lg" className="w-full" onClick={() => setReconcileOpen(true)}>
            Update balances
          </Button>
        </>
      )}

      <ReconcileDrawer
        open={reconcileOpen}
        accounts={accounts}
        onReconcile={async (balances) => await reconcile({ balances })}
        onClose={() => setReconcileOpen(false)}
      />

      <ManageAccountsDrawer
        open={manageOpen}
        accounts={accounts}
        onCreate={async (name, currentBalance) => { await createAccount({ name, currentBalance }); }}
        onRename={async (id: Id<"accounts">, name) => { await updateAccount({ accountId: id, name }); }}
        onArchive={async (id: Id<"accounts">) => { await archiveAccount({ accountId: id }); }}
        onClose={() => setManageOpen(false)}
      />
    </main>
  );
}
