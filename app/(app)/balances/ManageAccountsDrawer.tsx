"use client";

import { useEffect, useState } from "react";
import { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { IconPlus, IconTrash, IconCheck, IconX } from "@/components/icons";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export function ManageAccountsDrawer({
  open,
  accounts,
  onCreate,
  onRename,
  onArchive,
  onClose,
}: {
  open: boolean;
  accounts: Doc<"accounts">[];
  onCreate: (name: string, currentBalance: number) => Promise<void>;
  onRename: (id: Doc<"accounts">["_id"], name: string) => Promise<void>;
  onArchive: (id: Doc<"accounts">["_id"]) => Promise<void>;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newBalance, setNewBalance] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNewName("");
    setNewBalance("");
    setBusy(false);
  }, [open]);

  async function handleAdd() {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await onCreate(newName.trim(), parseFloat(newBalance) || 0);
      setNewName("");
      setNewBalance("");
    } finally {
      setBusy(false);
    }
  }

  function handleOpenChange(o: boolean) {
    if (!o) onClose();
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Manage accounts</DrawerTitle>
            <DrawerDescription>
              Cash, e-wallets, bank — wherever your money sits.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2 space-y-3">
            {accounts.length === 0 ? (
              <p className="text-sm text-muted py-2">No accounts yet.</p>
            ) : (
              <ul className="space-y-2">
                {accounts.map((a) => (
                  <AccountRow key={a._id} account={a} onRename={onRename} onArchive={onArchive} />
                ))}
              </ul>
            )}

            <div className="pt-2 border-t border-border/40 space-y-2">
              <div className="flex items-center gap-2">
                <IconPlus width={14} height={14} className="text-muted" strokeWidth={1.4} />
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New account (e.g. GCash)"
                  className="flex-1 bg-transparent border-0 border-b border-transparent hover:border-border focus:border-foreground/30 outline-none py-2 text-base placeholder:text-muted focus-visible:!outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-medium w-[14px] text-center text-muted">₱</span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value.replace(/[^0-9.]/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="Current balance"
                  className="flex-1 bg-transparent border-0 border-b border-transparent hover:border-border focus:border-foreground/30 outline-none py-2 text-base tabular-nums placeholder:text-muted focus-visible:!outline-none"
                />
                <Button size="sm" onClick={handleAdd} disabled={busy || !newName.trim()}>
                  Add
                </Button>
              </div>
            </div>
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" size="lg">Done</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function AccountRow({
  account,
  onRename,
  onArchive,
}: {
  account: Doc<"accounts">;
  onRename: (id: Doc<"accounts">["_id"], name: string) => Promise<void>;
  onArchive: (id: Doc<"accounts">["_id"]) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(account.name);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(account.name);
  }, [account.name]);

  async function saveName() {
    const t = name.trim();
    if (!t || t === account.name) {
      setEditing(false);
      setName(account.name);
      return;
    }
    setBusy(true);
    try {
      await onRename(account._id, t);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    setBusy(true);
    try {
      await onArchive(account._id);
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  return (
    <li className="flex items-center gap-3 py-2">
      <span className="size-3 rounded-full shrink-0" style={{ background: account.color }} />
      {editing ? (
        <>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") { setName(account.name); setEditing(false); }
            }}
            autoFocus
            className="flex-1 bg-transparent border-b border-border px-1 py-1 text-base outline-none focus:border-foreground focus-visible:!outline-none"
          />
          <button type="button" onClick={saveName} disabled={busy} aria-label="Save" className="text-success p-1.5">
            <IconCheck width={16} height={16} strokeWidth={1.8} />
          </button>
          <button type="button" onClick={() => { setName(account.name); setEditing(false); }} disabled={busy} aria-label="Cancel rename" className="text-muted p-1.5">
            <IconX width={14} height={14} strokeWidth={1.5} />
          </button>
        </>
      ) : confirm ? (
        <>
          <span className="flex-1 text-sm text-destructive">Remove &ldquo;{account.name}&rdquo;?</span>
          <button type="button" onClick={handleArchive} disabled={busy} className="text-xs text-destructive px-2 py-1">Confirm</button>
          <button type="button" onClick={() => setConfirm(false)} disabled={busy} className="text-xs text-muted px-2 py-1">Cancel</button>
        </>
      ) : (
        <>
          <button type="button" onClick={() => setEditing(true)} className="flex-1 text-left text-base hover:opacity-80 transition-opacity">
            {account.name}
          </button>
          <button type="button" onClick={() => setConfirm(true)} aria-label={`Remove ${account.name}`} className="text-muted hover:text-destructive transition-colors p-1.5">
            <IconTrash width={14} height={14} strokeWidth={1.4} />
          </button>
        </>
      )}
    </li>
  );
}
