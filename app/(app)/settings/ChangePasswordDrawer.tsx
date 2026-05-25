"use client";

import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
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

export function ChangePasswordDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const changePassword = useAction(api.auth.changePassword);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const currentRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setCurrent("");
    setNext("");
    setConfirm("");
    setSaving(false);
    setError(null);
    setDone(false);
    const t = setTimeout(() => currentRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [open]);

  const mismatch = confirm.length > 0 && next !== confirm;
  const tooShort = next.length > 0 && next.length < 8;
  const valid =
    current.length > 0 && next.length >= 8 && next === confirm;

  async function submit() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      setDone(true);
      setTimeout(() => onClose(), 1200);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't change password.";
      const cleaned = msg.replace(/^\[CONVEX A?\(?[^)]*\)?]\s*/i, "");
      setError(cleaned);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Change password</DrawerTitle>
            <DrawerDescription>
              You&rsquo;ll stay signed in on this device after the change.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2 space-y-4">
            <label className="block">
              <span className="text-sm text-muted-foreground mb-2 block">Current password</span>
              <input
                ref={currentRef}
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="w-full bg-transparent border-0 border-b-2 border-border px-1 py-2 text-base outline-none focus:border-foreground focus-visible:!outline-none transition-colors"
              />
            </label>

            <label className="block">
              <span className="text-sm text-muted-foreground mb-2 block">New password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className="w-full bg-transparent border-0 border-b-2 border-border px-1 py-2 text-base outline-none focus:border-foreground focus-visible:!outline-none transition-colors"
              />
              {tooShort && (
                <span className="text-xs text-destructive mt-1 block">
                  Must be at least 8 characters.
                </span>
              )}
            </label>

            <label className="block">
              <span className="text-sm text-muted-foreground mb-2 block">Confirm new password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="w-full bg-transparent border-0 border-b-2 border-border px-1 py-2 text-base outline-none focus:border-foreground focus-visible:!outline-none transition-colors"
              />
              {mismatch && (
                <span className="text-xs text-destructive mt-1 block">
                  Passwords don&rsquo;t match.
                </span>
              )}
            </label>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {done && (
              <p className="text-sm text-success">Password changed.</p>
            )}
          </div>

          <DrawerFooter>
            <Button onClick={submit} disabled={saving || !valid || done} size="lg">
              {saving ? "Saving…" : done ? "Done" : "Change password"}
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
