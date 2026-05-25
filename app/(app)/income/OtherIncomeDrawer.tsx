"use client";

import { useEffect, useRef, useState } from "react";
import { Doc } from "@/convex/_generated/dataModel";
import { todayLocal, addDaysIso, parseLocal } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { IconTrash } from "@/components/icons";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export type OtherIncomeEditorState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; entry: Doc<"otherIncome"> };

type FormData = {
  entryDate: string;
  amount: number;
  source: string;
  note?: string;
};

function monthsAgoIso(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function OtherIncomeDrawer({
  state,
  onSave,
  onDelete,
  onClose,
}: {
  state: OtherIncomeEditorState;
  onSave: (data: FormData) => Promise<void>;
  onDelete: (id: Doc<"otherIncome">["_id"]) => Promise<void>;
  onClose: () => void;
}) {
  const [entryDate, setEntryDate] = useState<string>(todayLocal());
  const [amount, setAmount] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const isOpen = state.mode !== "closed";
  const isEdit = state.mode === "edit";

  const min = monthsAgoIso(3);
  const max = todayLocal();

  useEffect(() => {
    if (!isOpen) return;
    if (state.mode === "edit") {
      setEntryDate(state.entry.entryDate);
      setAmount(state.entry.amount.toString());
      setSource(state.entry.source);
      setNote(state.entry.note ?? "");
    } else {
      setEntryDate(todayLocal());
      setAmount("");
      setSource("");
      setNote("");
    }
    setSaving(false);
    const t = setTimeout(() => amountRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [isOpen, state]);

  const amtNum = parseFloat(amount);
  const valid =
    !isNaN(amtNum) &&
    amtNum > 0 &&
    source.trim().length > 0 &&
    entryDate >= min &&
    entryDate <= max;

  async function submit() {
    if (!valid) return;
    setSaving(true);
    try {
      await onSave({
        entryDate,
        amount: amtNum,
        source: source.trim(),
        note: note.trim() ? note.trim() : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (state.mode !== "edit") return;
    if (!confirm("Delete this entry?")) return;
    setSaving(true);
    try {
      await onDelete(state.entry._id);
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  const isToday = entryDate === todayLocal();
  const isYesterday = entryDate === addDaysIso(todayLocal(), -1);
  let dateLabel: string;
  if (isToday) dateLabel = "Today";
  else if (isYesterday) dateLabel = "Yesterday";
  else {
    dateLabel = parseLocal(entryDate).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>{isEdit ? "Edit income" : "Log other income"}</DrawerTitle>
            <DrawerDescription>
              {isEdit
                ? "Update or delete this entry."
                : "Gifts, refunds, side-gigs — anything outside your regular pay."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2 space-y-5">
            <label className="block">
              <span className="text-sm text-muted-foreground mb-2 block">Date</span>
              <div className="flex items-center gap-3">
                <span className="text-base tabular-nums">{dateLabel}</span>
                <input
                  type="date"
                  value={entryDate}
                  min={min}
                  max={max}
                  onChange={(e) => e.target.value && setEntryDate(e.target.value)}
                  className="ml-auto bg-transparent border border-border rounded-md px-2 py-1 text-sm outline-none focus:border-foreground/40 focus-visible:!outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm text-muted-foreground mb-2 block">Source</span>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Gift from Mom, refund, side project…"
                className="w-full bg-transparent border-0 border-b-2 border-border px-1 py-2 text-base outline-none focus:border-foreground focus-visible:!outline-none transition-colors"
              />
            </label>

            <label className="block">
              <span className="text-sm text-muted-foreground mb-2 block">Amount</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-medium">₱</span>
                <input
                  ref={amountRef}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="0"
                  className="flex-1 bg-transparent border-0 border-b-2 border-border px-1 py-2 text-2xl tabular-nums font-medium outline-none focus:border-foreground focus-visible:!outline-none transition-colors"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm text-muted-foreground mb-2 block">Note (optional)</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything to remember"
                className="w-full bg-transparent border-0 border-b-2 border-border px-1 py-2 text-base outline-none focus:border-foreground focus-visible:!outline-none transition-colors"
              />
            </label>
          </div>

          <DrawerFooter>
            <Button onClick={submit} disabled={saving || !valid} size="lg">
              {saving ? "Saving…" : isEdit ? "Save changes" : "Log income"}
            </Button>
            {isEdit && (
              <Button
                variant="destructive"
                size="lg"
                onClick={handleDelete}
                disabled={saving}
              >
                <IconTrash width={14} height={14} strokeWidth={1.5} />
                Delete entry
              </Button>
            )}
            <DrawerClose asChild>
              <Button variant="outline" size="lg">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
