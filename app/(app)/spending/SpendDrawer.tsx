"use client";

import { useEffect, useRef, useState } from "react";
import { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/cn";
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

type Category = "needed" | "unnecessary" | "other";

export type SpendEditorState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; entry: Doc<"spendEntries"> };

type FormData = {
  entryDate: string;
  category: Category;
  amount: number;
  note?: string;
};

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "needed", label: "Needed" },
  { key: "unnecessary", label: "Unnecessary" },
  { key: "other", label: "Other" },
];

function monthsAgoIso(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function SpendDrawer({
  state,
  onSave,
  onDelete,
  onClose,
}: {
  state: SpendEditorState;
  onSave: (data: FormData) => Promise<void>;
  onDelete: (id: Doc<"spendEntries">["_id"]) => Promise<void>;
  onClose: () => void;
}) {
  const [entryDate, setEntryDate] = useState<string>(todayLocal());
  const [category, setCategory] = useState<Category>("unnecessary");
  const [amount, setAmount] = useState<string>("");
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
      setCategory(state.entry.category);
      setAmount(state.entry.amount.toString());
      setNote(state.entry.note ?? "");
    } else {
      setEntryDate(todayLocal());
      setCategory("unnecessary");
      setAmount("");
      setNote("");
    }
    setSaving(false);
    const t = setTimeout(() => amountRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [isOpen, state]);

  const amtNum = parseFloat(amount);
  const valid = !isNaN(amtNum) && amtNum > 0 && entryDate >= min && entryDate <= max;

  async function submit() {
    if (!valid) return;
    setSaving(true);
    try {
      await onSave({
        entryDate,
        category,
        amount: amtNum,
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
            <DrawerTitle>{isEdit ? "Edit spend" : "Log a spend"}</DrawerTitle>
            <DrawerDescription>
              {isEdit ? "Update or delete this entry." : "Quick log: amount + category."}
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

            <div>
              <span className="text-sm text-muted-foreground mb-2 block">Category</span>
              <div className="flex gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                      category === c.key
                        ? "bg-foreground text-background"
                        : "bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

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
                placeholder="Jollibee, Shopee, ..."
                className="w-full bg-transparent border-0 border-b-2 border-border px-1 py-2 text-base outline-none focus:border-foreground focus-visible:!outline-none transition-colors"
              />
            </label>
          </div>

          <DrawerFooter>
            <Button onClick={submit} disabled={saving || !valid} size="lg">
              {saving ? "Saving…" : isEdit ? "Save changes" : "Log spend"}
            </Button>
            {isEdit && (
              <Button
                variant="destructive"
                size="lg"
                onClick={handleDelete}
                disabled={saving}
              >
                <IconTrash width={14} height={14} strokeWidth={1.5} />
                Delete spend
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
