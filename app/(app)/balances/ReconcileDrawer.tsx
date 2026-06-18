"use client";

import { useEffect, useState } from "react";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { pesoZero } from "@/lib/currency";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type Balance = { accountId: Id<"accounts">; balance: number };

export function ReconcileDrawer({
  open,
  accounts,
  onReconcile,
  onClose,
}: {
  open: boolean;
  accounts: Doc<"accounts">[];
  onReconcile: (balances: Balance[]) => Promise<{ netWorth: number; gap: number }>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ netWorth: number; gap: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const a of accounts) next[a._id] = a.currentBalance.toString();
    setValues(next);
    setSaving(false);
    setResult(null);
  }, [open, accounts]);

  function handleOpenChange(o: boolean) {
    if (!o) onClose();
  }

  async function submit() {
    setSaving(true);
    try {
      const balances: Balance[] = accounts.map((a) => ({
        accountId: a._id,
        balance: parseFloat(values[a._id] ?? "") || 0,
      }));
      const r = await onReconcile(balances);
      setResult(r);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Update balances</DrawerTitle>
            <DrawerDescription>
              {result
                ? "Done — your numbers are caught up."
                : "Type what each account actually has right now."}
            </DrawerDescription>
          </DrawerHeader>

          {result ? (
            <div className="px-4 pb-2 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Net worth</p>
              <p className="text-3xl font-semibold tabular-nums">{pesoZero(result.netWorth)}</p>
              {result.gap > 0 && (
                <p className="text-sm text-muted-foreground">
                  We logged <span className="text-foreground">{pesoZero(result.gap)}</span> of
                  spending you hadn&rsquo;t recorded.
                </p>
              )}
              {result.gap < 0 && (
                <p className="text-sm text-muted-foreground">
                  You had <span className="text-foreground">{pesoZero(-result.gap)}</span> more than
                  expected — added back to your savings.
                </p>
              )}
              {result.gap === 0 && (
                <p className="text-sm text-muted-foreground">Everything matched. Nice.</p>
              )}
            </div>
          ) : (
            <div className="px-4 pb-2 space-y-4">
              {accounts.map((a) => (
                <label key={a._id} className="block">
                  <span className="text-sm text-muted-foreground mb-1.5 flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: a.color }} />
                    {a.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-medium">₱</span>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={values[a._id] ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [a._id]: e.target.value.replace(/[^0-9.]/g, "") }))
                      }
                      className="flex-1 bg-transparent border-0 border-b-2 border-border px-1 py-2 text-2xl tabular-nums font-medium outline-none focus:border-foreground focus-visible:!outline-none transition-colors"
                    />
                  </div>
                </label>
              ))}
            </div>
          )}

          <DrawerFooter>
            {result ? (
              <DrawerClose asChild>
                <Button size="lg">Done</Button>
              </DrawerClose>
            ) : (
              <>
                <Button onClick={submit} disabled={saving || accounts.length === 0} size="lg">
                  {saving ? "Saving…" : "Update balances"}
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline" size="lg">Cancel</Button>
                </DrawerClose>
              </>
            )}
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
