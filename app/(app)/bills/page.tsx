"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { IconCheck, IconArrow, IconPlus, IconTrash } from "@/components/icons";
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

type TemplateEditorState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; template: Doc<"billTemplates"> };

export default function BillsPage() {
  const templates = useQuery(api.bills.listTemplates);
  const periods = useQuery(api.bills.listPeriods);
  const generateMissing = useMutation(api.bills.generateMissingPeriods);
  const markPaid = useMutation(api.bills.markPaid);
  const markUnpaid = useMutation(api.bills.markUnpaid);
  const updatePeriodAmount = useMutation(api.bills.updatePeriodAmount);
  const createTemplate = useMutation(api.bills.createTemplate);
  const updateTemplate = useMutation(api.bills.updateTemplate);
  const deleteTemplate = useMutation(api.bills.deleteTemplate);

  const [payingPeriod, setPayingPeriod] = useState<Doc<"billPeriods"> | null>(null);
  const [payingTemplate, setPayingTemplate] = useState<Doc<"billTemplates"> | null>(null);
  const [editor, setEditor] = useState<TemplateEditorState>({ mode: "closed" });

  const didGenerate = useRef(false);
  useEffect(() => {
    if (didGenerate.current) return;
    if (!templates || !periods) return;
    if (templates.length === 0) return;
    didGenerate.current = true;
    generateMissing().catch(() => { didGenerate.current = false; });
  }, [templates, periods, generateMissing]);

  const periodsByTemplate = useMemo(() => {
    const m = new Map<string, Doc<"billPeriods">[]>();
    for (const p of periods ?? []) {
      const arr = m.get(p.templateId) ?? [];
      arr.push(p);
      m.set(p.templateId, arr);
    }
    return m;
  }, [periods]);

  function openPay(period: Doc<"billPeriods">, template: Doc<"billTemplates">) {
    setPayingPeriod(period);
    setPayingTemplate(template);
  }

  async function confirmPay(amount: number) {
    if (!payingPeriod) return;
    await updatePeriodAmount({ periodId: payingPeriod._id, amount });
    await markPaid({ periodId: payingPeriod._id });
    setPayingPeriod(null);
    setPayingTemplate(null);
  }

  async function saveTemplate(data: TemplateFormData) {
    if (editor.mode === "create") {
      await createTemplate(data);
    } else if (editor.mode === "edit") {
      await updateTemplate({ templateId: editor.template._id, ...data });
    }
    setEditor({ mode: "closed" });
  }

  async function removeTemplate(id: Id<"billTemplates">) {
    await deleteTemplate({ templateId: id });
    setEditor({ mode: "closed" });
  }

  const loading = templates === undefined || periods === undefined;

  return (
    <main className="mx-auto max-w-xl px-5 pt-6 sm:px-8 sm:pt-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Bills</h1>
        {templates && templates.length > 0 && (
          <button
            type="button"
            onClick={() => setEditor({ mode: "create" })}
            aria-label="Add bill"
            className="flex items-center justify-center size-9 rounded-full bg-card text-ink hover:opacity-80 transition-opacity"
          >
            <IconPlus width={18} height={18} strokeWidth={1.6} />
          </button>
        )}
      </header>

      <section className="space-y-4">
        {loading ? (
          <SkeletonList />
        ) : templates.length === 0 ? (
          <EmptyState onAdd={() => setEditor({ mode: "create" })} />
        ) : (
          templates.map((template, i) => (
            <BillCard
              key={template._id}
              template={template}
              allPeriods={periodsByTemplate.get(template._id) ?? []}
              onPay={(p) => openPay(p, template)}
              onUndo={async (id) => { await markUnpaid({ periodId: id }); }}
              onEdit={() => setEditor({ mode: "edit", template })}
              index={i}
            />
          ))
        )}
      </section>

      <PayDrawer
        period={payingPeriod}
        template={payingTemplate}
        onConfirm={confirmPay}
        onClose={() => { setPayingPeriod(null); setPayingTemplate(null); }}
      />

      <TemplateDrawer
        state={editor}
        onSave={saveTemplate}
        onDelete={removeTemplate}
        onClose={() => setEditor({ mode: "closed" })}
      />
    </main>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="fade-in flex flex-col items-center justify-center py-20 gap-4">
      <p className="text-muted">No bills yet.</p>
      <Button size="lg" onClick={onAdd}>
        <IconPlus width={14} height={14} strokeWidth={1.6} />
        Add your first bill
      </Button>
    </div>
  );
}

function BillCard({
  template,
  allPeriods,
  onPay,
  onUndo,
  onEdit,
  index,
}: {
  template: Doc<"billTemplates">;
  allPeriods: Doc<"billPeriods">[];
  onPay: (period: Doc<"billPeriods">) => void;
  onUndo: (id: Doc<"billPeriods">["_id"]) => Promise<void>;
  onEdit: () => void;
  index: number;
}) {
  const [showPast, setShowPast] = useState(false);
  const today = todayLocal();
  const currentMonth = today.slice(0, 7);

  const sorted = [...allPeriods].sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));

  const thisMonth = sorted.filter((p) => p.dueDate.startsWith(currentMonth));
  const past = sorted
    .filter((p) => !p.dueDate.startsWith(currentMonth) && p.dueDate < today)
    .sort((a, b) => (a.dueDate > b.dueDate ? -1 : 1))
    .slice(0, 5);
  const futureUnpaid = sorted.find(
    (p) => !p.paid && !p.dueDate.startsWith(currentMonth) && p.dueDate > today,
  );

  const allThisMonthPaid = thisMonth.length > 0 && thisMonth.every((p) => p.paid);
  const overdueCount = thisMonth.filter((p) => !p.paid && p.dueDate < today).length;

  return (
    <div className={cn("fade-in bg-card rounded-xl p-4", `fade-in-${Math.min(index + 1, 4)}`)}>
      <header className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-lg">{template.name}</h2>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${template.name}`}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider"
        >
          ···
        </button>
      </header>

      <p className="text-xs text-muted-foreground mb-3">
        <span>Due the {ordinal(template.dueDay)}</span>
        <span className="mx-1.5">·</span>
        <span>
          {allThisMonthPaid
            ? "Paid this month ✓"
            : overdueCount > 0
              ? `${overdueCount} overdue`
              : "Up to date"}
        </span>
      </p>

      {thisMonth.length === 0 && !futureUnpaid ? (
        <p className="text-sm text-muted-foreground">No upcoming due dates.</p>
      ) : (
        <ul>
          {thisMonth.map((p) => (
            <BillRow
              key={p._id}
              period={p}
              template={template}
              today={today}
              onPay={() => onPay(p)}
              onUndo={() => onUndo(p._id)}
            />
          ))}
          {futureUnpaid && (
            <BillRow
              key={futureUnpaid._id}
              period={futureUnpaid}
              template={template}
              today={today}
              onPay={() => onPay(futureUnpaid)}
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

function BillRow({
  period,
  template,
  today,
  onPay,
  onUndo,
}: {
  period: Doc<"billPeriods">;
  template: Doc<"billTemplates">;
  today: string;
  onPay: () => void;
  onUndo: () => Promise<void>;
}) {
  const isOverdue = !period.paid && period.dueDate < today;
  const isFuture = period.dueDate > today;
  const showApprox = template.variableAmount && !period.paid;

  return (
    <li className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
      <span className={cn(
        "font-mono text-sm tabular-nums w-16 shrink-0",
        period.paid ? "text-muted-foreground line-through" : isOverdue ? "text-destructive font-medium" : isFuture ? "text-muted-foreground" : "text-foreground",
      )}>
        {formatShort(period.dueDate)}
      </span>

      <span className="flex-1 text-sm tabular-nums text-muted-foreground">
        {period.paid
          ? ""
          : period.amount
            ? `${showApprox ? "~" : ""}${peso(period.amount)}`
            : ""}
      </span>

      {period.paid ? (
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
          onClick={onPay}
          className="flex items-center gap-1 text-xs font-medium text-primary-foreground bg-destructive px-2.5 py-1.5 rounded-lg hover:opacity-90 transition-opacity shrink-0"
        >
          Overdue
          <IconArrow width={10} height={10} strokeWidth={1.5} />
        </button>
      ) : (
        <Button variant="outline" size="sm" onClick={onPay} className="text-xs h-auto py-1.5 px-2.5">
          <IconCheck width={10} height={10} strokeWidth={1.5} />
          Mark paid
        </Button>
      )}
    </li>
  );
}

function PastRow({
  period,
  onUndo,
}: {
  period: Doc<"billPeriods">;
  onUndo: () => Promise<void>;
}) {
  return (
    <li className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0 opacity-60">
      <span className={cn(
        "font-mono text-sm tabular-nums w-16 shrink-0",
        period.paid ? "text-muted-foreground line-through" : "text-destructive",
      )}>
        {formatShort(period.dueDate)}
      </span>
      <span className="flex-1 text-sm tabular-nums text-muted-foreground">
        {peso(period.amount)}
      </span>
      {period.paid ? (
        <button type="button" onClick={onUndo} className="text-xs text-success/70">✓</button>
      ) : (
        <span className="text-xs text-destructive">missed</span>
      )}
    </li>
  );
}

function PayDrawer({
  period,
  template,
  onConfirm,
  onClose,
}: {
  period: Doc<"billPeriods"> | null;
  template: Doc<"billTemplates"> | null;
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
    const prefill = period?.amount ?? template?.amount;
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
            <DrawerTitle>Log payment — {template?.name ?? ""}</DrawerTitle>
            <DrawerDescription>
              {period ? `${formatShort(period.dueDate)} due date` : ""}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2">
            <label className="block">
              <span className="text-sm text-muted-foreground mb-2 block">Amount paid</span>
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
              {saving ? "Logging…" : "Confirm paid"}
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

type TemplateFormData = {
  name: string;
  amount: number;
  dueDay: number;
  variableAmount: boolean;
};

function TemplateDrawer({
  state,
  onSave,
  onDelete,
  onClose,
}: {
  state: TemplateEditorState;
  onSave: (data: TemplateFormData) => Promise<void>;
  onDelete: (id: Id<"billTemplates">) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [variableAmount, setVariableAmount] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOpen = state.mode !== "closed";
  const isEdit = state.mode === "edit";

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  function reset() {
    if (state.mode === "edit") {
      setName(state.template.name);
      setAmount(state.template.amount.toString());
      setDueDay(state.template.dueDay.toString());
      setVariableAmount(state.template.variableAmount);
    } else {
      setName("");
      setAmount("");
      setDueDay("");
      setVariableAmount(false);
    }
    setSaving(false);
  }

  const dayNum = parseInt(dueDay, 10);
  const amtNum = parseFloat(amount);
  const valid =
    name.trim().length > 0 &&
    !isNaN(amtNum) && amtNum > 0 &&
    !isNaN(dayNum) && dayNum >= 1 && dayNum <= 31;

  async function submit() {
    if (!valid) return;
    setSaving(true);
    await onSave({
      name: name.trim(),
      amount: amtNum,
      dueDay: dayNum,
      variableAmount,
    });
    setSaving(false);
  }

  async function handleDelete() {
    if (state.mode !== "edit") return;
    if (!confirm(`Delete "${state.template.name}"? All history will be removed.`)) return;
    setSaving(true);
    await onDelete(state.template._id);
    setSaving(false);
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange} onAnimationEnd={() => isOpen && reset()}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>{isEdit ? "Edit bill" : "New bill"}</DrawerTitle>
            <DrawerDescription>
              {isEdit ? "Changes apply to future months only." : "Recurring monthly payment."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2 space-y-4">
            <label className="block">
              <span className="text-sm text-muted-foreground mb-2 block">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Electricity"
                className="w-full bg-transparent border-0 border-b-2 border-border px-1 py-2 text-lg outline-none focus:border-foreground focus-visible:!outline-none transition-colors"
              />
            </label>

            <label className="block">
              <span className="text-sm text-muted-foreground mb-2 block">Typical amount</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-medium">₱</span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0"
                  className="flex-1 bg-transparent border-0 border-b-2 border-border px-1 py-2 text-xl tabular-nums font-medium outline-none focus:border-foreground focus-visible:!outline-none transition-colors"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm text-muted-foreground mb-2 block">Due day (of the month)</span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
                placeholder="5"
                className="w-24 bg-transparent border-0 border-b-2 border-border px-1 py-2 text-xl tabular-nums font-medium outline-none focus:border-foreground focus-visible:!outline-none transition-colors"
              />
              <span className="ml-2 text-sm text-muted-foreground">
                {dayNum >= 1 && dayNum <= 31 ? `The ${ordinal(dayNum)}` : "1–31"}
              </span>
            </label>

            <label className="flex items-start gap-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={variableAmount}
                onChange={(e) => setVariableAmount(e.target.checked)}
                className="mt-0.5 size-4 rounded border-border accent-foreground"
              />
              <span>
                <span className="block text-sm font-medium">Variable amount</span>
                <span className="block text-xs text-muted-foreground">
                  Amount changes month to month (e.g. electricity, water).
                </span>
              </span>
            </label>
          </div>

          <DrawerFooter>
            <Button onClick={submit} disabled={saving || !valid} size="lg">
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add bill"}
            </Button>
            {isEdit && (
              <Button variant="destructive" size="lg" onClick={handleDelete} disabled={saving}>
                <IconTrash width={14} height={14} strokeWidth={1.5} />
                Delete bill
              </Button>
            )}
            <DrawerClose asChild>
              <Button variant="outline" size="lg">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
