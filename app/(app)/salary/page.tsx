"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useMemo, useState, useRef } from "react";
import { cn } from "@/lib/cn";
import { IconCheck, IconArrow } from "@/components/icons";
import { todayLocal, formatShort, ordinal } from "@/lib/date";
import { peso } from "@/lib/currency";
import { SkeletonList } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export default function SalaryPage() {
  const clients = useQuery(api.clients.listMine);
  const periods = useQuery(api.pay.listMine);
  const markReceived = useMutation(api.pay.markReceived);
  const markPending = useMutation(api.pay.markPending);
  const updateAmount = useMutation(api.pay.updateAmount);

  const [receivingPeriod, setReceivingPeriod] = useState<Doc<"payPeriods"> | null>(null);
  const [receivingClient, setReceivingClient] = useState<Doc<"clients"> | null>(null);

  const periodsByClient = useMemo(() => {
    const m = new Map<string, Doc<"payPeriods">[]>();
    for (const p of periods ?? []) {
      const arr = m.get(p.clientId) ?? [];
      arr.push(p);
      m.set(p.clientId, arr);
    }
    return m;
  }, [periods]);

  function openReceive(period: Doc<"payPeriods">, client: Doc<"clients">) {
    setReceivingPeriod(period);
    setReceivingClient(client);
  }

  async function confirmReceive(amount: number) {
    if (!receivingPeriod) return;
    await updateAmount({ periodId: receivingPeriod._id, amount });
    await markReceived({ periodId: receivingPeriod._id });
    setReceivingPeriod(null);
    setReceivingClient(null);
  }

  return (
    <main className="mx-auto max-w-xl px-5 pt-6 sm:px-8 sm:pt-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Salary</h1>
      </header>

      <section className="space-y-4">
        {clients === undefined ? (
          <SkeletonList />
        ) : clients.length === 0 ? (
          <p className="text-center text-muted py-16">No clients yet.</p>
        ) : (
          clients.map((client, i) => (
            <ClientSalaryCard
              key={client._id}
              client={client}
              allPeriods={periodsByClient.get(client._id) ?? []}
              onReceive={(p) => openReceive(p, client)}
              onUndo={async (id) => { await markPending({ periodId: id }); }}
              index={i}
            />
          ))
        )}
      </section>

      <ReceiveDrawer
        period={receivingPeriod}
        clientName={receivingClient?.name ?? ""}
        defaultAmount={receivingClient?.defaultAmount}
        onConfirm={confirmReceive}
        onClose={() => { setReceivingPeriod(null); setReceivingClient(null); }}
      />
    </main>
  );
}

function ReceiveDrawer({
  period,
  clientName,
  defaultAmount,
  onConfirm,
  onClose,
}: {
  period: Doc<"payPeriods"> | null;
  clientName: string;
  defaultAmount: number | undefined;
  onConfirm: (amount: number) => Promise<void>;
  onClose: () => void;
}) {
  const [amtVal, setAmtVal] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOpen = !!period;

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  function reset() {
    const prefill = period?.amount ?? defaultAmount;
    setAmtVal(prefill ? prefill.toString() : "");
    setSaving(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function submit() {
    const n = parseFloat(amtVal);
    if (isNaN(n) || n <= 0) return;
    setSaving(true);
    await onConfirm(n);
    setSaving(false);
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange} onAnimationEnd={() => isOpen && reset()}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Log payment — {clientName}</DrawerTitle>
            <DrawerDescription>
              {period ? formatShort(period.payDate) : ""} pay date
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2">
            <label className="block">
              <span className="text-sm text-muted-foreground mb-2 block">Amount received</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-medium">₱</span>
                <input
                  ref={inputRef}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={amtVal}
                  onChange={(e) => setAmtVal(e.target.value.replace(/[^0-9.]/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="0"
                  className="flex-1 bg-transparent border-0 border-b-2 border-border px-1 py-2 text-2xl tabular-nums font-medium outline-none focus:border-foreground focus-visible:!outline-none transition-colors"
                />
              </div>
            </label>
          </div>

          <DrawerFooter>
            <Button onClick={submit} disabled={saving || !amtVal} size="lg">
              {saving ? "Logging…" : "Confirm received"}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" size="lg">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function ClientSalaryCard({
  client,
  allPeriods,
  onReceive,
  onUndo,
  index,
}: {
  client: Doc<"clients">;
  allPeriods: Doc<"payPeriods">[];
  onReceive: (period: Doc<"payPeriods">) => void;
  onUndo: (id: Doc<"payPeriods">["_id"]) => Promise<void>;
  index: number;
}) {
  const [showPast, setShowPast] = useState(false);
  const today = todayLocal();
  const currentMonth = today.slice(0, 7);

  const sorted = [...allPeriods].sort((a, b) => (a.payDate < b.payDate ? -1 : 1));

  const thisMonth = sorted.filter((p) => p.payDate.startsWith(currentMonth));
  const past = sorted
    .filter((p) => !p.payDate.startsWith(currentMonth) && p.payDate < today)
    .sort((a, b) => (a.payDate > b.payDate ? -1 : 1))
    .slice(0, 5);
  const futureUnpaid = sorted.find(
    (p) => !p.received && !p.payDate.startsWith(currentMonth) && p.payDate > today,
  );

  const allThisMonthReceived = thisMonth.length > 0 && thisMonth.every((p) => p.received);
  const pendingCount = thisMonth.filter((p) => !p.received && p.payDate <= today).length;

  return (
    <div className={cn("fade-in bg-card rounded-xl p-4", `fade-in-${Math.min(index + 1, 4)}`)}>
      <header className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-lg">{client.name}</h2>
        <span className="text-xs text-muted-foreground">
          {client.payDays.map(ordinal).join(" & ")}
        </span>
      </header>

      <p className="text-xs text-muted-foreground mb-3">
        {allThisMonthReceived
          ? "All received this month ✓"
          : pendingCount > 0
            ? `${pendingCount} overdue`
            : "Up to date"}
      </p>

      {thisMonth.length === 0 && !futureUnpaid ? (
        <p className="text-sm text-muted-foreground">No pay dates. Set pay days in Settings.</p>
      ) : (
        <ul>
          {thisMonth.map((p) => (
            <PayDateRow
              key={p._id}
              period={p}
              today={today}
              onReceive={() => onReceive(p)}
              onUndo={() => onUndo(p._id)}
            />
          ))}
          {futureUnpaid && (
            <PayDateRow
              key={futureUnpaid._id}
              period={futureUnpaid}
              today={today}
              onReceive={() => onReceive(futureUnpaid)}
              onUndo={() => onUndo(futureUnpaid._id)}
            />
          )}
        </ul>
      )}

      {past.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <button
            type="button"
            onClick={() => setShowPast(!showPast)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPast ? "Hide past" : `View past (${past.length})`}
          </button>
          {showPast && (
            <ul className="mt-2 drawer-enter">
              {past.map((p) => (
                <PastRow key={p._id} period={p} onUndo={() => onUndo(p._id)} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function PayDateRow({
  period,
  today,
  onReceive,
  onUndo,
}: {
  period: Doc<"payPeriods">;
  today: string;
  onReceive: () => void;
  onUndo: () => Promise<void>;
}) {
  const isOverdue = !period.received && period.payDate < today;
  const isFuture = period.payDate > today;

  return (
    <li className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
      <span className={cn(
        "font-mono text-sm tabular-nums w-16 shrink-0",
        period.received ? "text-muted-foreground line-through" : isOverdue ? "text-destructive font-medium" : isFuture ? "text-muted-foreground" : "text-foreground",
      )}>
        {formatShort(period.payDate)}
      </span>

      <span className="flex-1 text-sm tabular-nums text-muted-foreground">
        {period.received && period.amount ? peso(period.amount) : ""}
      </span>

      {period.received ? (
        <button
          type="button"
          onClick={onUndo}
          className="flex items-center gap-1 text-xs text-success bg-success/10 px-2.5 py-1.5 rounded-lg hover:opacity-80 transition-opacity shrink-0"
        >
          <IconCheck width={12} height={12} strokeWidth={2} />
          {peso(period.amount)}
        </button>
      ) : isOverdue ? (
        <button
          type="button"
          onClick={onReceive}
          className="flex items-center gap-1 text-xs font-medium text-primary-foreground bg-destructive px-2.5 py-1.5 rounded-lg hover:opacity-90 transition-opacity shrink-0"
        >
          Overdue
          <IconArrow width={10} height={10} strokeWidth={1.5} />
        </button>
      ) : (
        <Button variant="outline" size="sm" onClick={onReceive} className="text-xs h-auto py-1.5 px-2.5">
          <IconCheck width={10} height={10} strokeWidth={1.5} />
          Received
        </Button>
      )}
    </li>
  );
}

function PastRow({
  period,
  onUndo,
}: {
  period: Doc<"payPeriods">;
  onUndo: () => Promise<void>;
}) {
  return (
    <li className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0 opacity-60">
      <span className={cn(
        "font-mono text-sm tabular-nums w-16 shrink-0",
        period.received ? "text-muted-foreground line-through" : "text-destructive",
      )}>
        {formatShort(period.payDate)}
      </span>
      <span className="flex-1 text-sm tabular-nums text-muted-foreground">
        {peso(period.amount)}
      </span>
      {period.received ? (
        <button type="button" onClick={onUndo} className="text-xs text-success/70">✓</button>
      ) : (
        <span className="text-xs text-destructive">missed</span>
      )}
    </li>
  );
}

