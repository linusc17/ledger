"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  currentEndpoint,
  needsHomeScreenInstall,
  permissionState,
  pushSupported,
  subscribe,
  unsubscribe,
} from "@/lib/push";
import { cn } from "@/lib/cn";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

type Status = "ready" | "blocked" | "unsupported" | "needs-install" | "no-key";

export function NotificationsSection() {
  const saveSubscription = useMutation(api.notifications.saveSubscription);
  const removeSubscription = useMutation(api.notifications.removeSubscription);
  const sendTest = useAction(api.push.sendTest);
  const deviceCount = useQuery(api.notifications.deviceCount);

  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<Status>("ready");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!VAPID_PUBLIC_KEY) {
        if (!cancelled) {
          setStatus("no-key");
          setLoaded(true);
        }
        return;
      }
      if (!pushSupported()) {
        if (!cancelled) {
          setStatus(needsHomeScreenInstall() ? "needs-install" : "unsupported");
          setLoaded(true);
        }
        return;
      }

      const endpoint = await currentEndpoint();
      if (cancelled) return;
      const permission = permissionState();
      setEnabled(!!endpoint && permission === "granted");
      setStatus(permission === "denied" ? "blocked" : "ready");
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle() {
    setMessage(null);
    setBusy(true);
    try {
      if (enabled) {
        const endpoint = await unsubscribe();
        if (endpoint) await removeSubscription({ endpoint });
        setEnabled(false);
        return;
      }

      const result = await subscribe(VAPID_PUBLIC_KEY);
      if (!result.ok) {
        if (result.reason === "denied") {
          setStatus("blocked");
          setMessage(
            "Tally can't show notifications right now. Turn them back on for Tally in your device settings.",
          );
        } else if (result.reason === "unsupported") {
          setStatus("unsupported");
        } else {
          setMessage("That didn't work. Try again.");
        }
        return;
      }

      await saveSubscription({
        endpoint: result.endpoint,
        p256dh: result.p256dh,
        auth: result.auth,
      });
      setEnabled(true);
      setMessage("Reminders are on for this device.");
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setMessage(null);
    setBusy(true);
    try {
      const { sent } = await sendTest({});
      setMessage(
        sent > 0
          ? "Sent — it should arrive in a moment."
          : "No devices are set up yet.",
      );
    } catch {
      setMessage("That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const hint =
    status === "needs-install"
      ? "Add Tally to your Home Screen first — tap Share, then Add to Home Screen. Reminders can only reach you from there."
      : status === "unsupported"
        ? "This browser can't show reminders. Try Safari or Chrome."
        : status === "no-key"
          ? "Reminders aren't set up on the server yet."
          : status === "blocked"
            ? "Tally can't show notifications right now. Turn them back on for Tally in your device settings."
            : null;

  const canToggle = loaded && status === "ready" && !busy;

  return (
    <section className="mt-8 bg-bg-2 rounded-xl p-5">
      <h3 className="text-sm font-medium text-muted mb-1">Clock-out reminders</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Get a nudge when a shift is done, even when Tally is closed. Each device
        is set up separately.
      </p>

      <button
        type="button"
        onClick={toggle}
        disabled={!canToggle}
        className="w-full flex items-center justify-between py-2 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="text-base text-left">
          Reminders on this device
          {enabled && deviceCount !== undefined && deviceCount > 1 && (
            <span className="block text-xs text-muted-foreground">
              On for {deviceCount} devices
            </span>
          )}
        </span>
        <span
          role="switch"
          aria-checked={enabled}
          className={cn(
            "relative w-9 h-5 rounded-full transition-colors shrink-0",
            enabled ? "bg-foreground" : "bg-border",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-4 rounded-full bg-background transition-all",
              enabled ? "left-[18px]" : "left-0.5",
            )}
          />
        </span>
      </button>

      {hint && <p className="text-xs text-muted-foreground mt-2">{hint}</p>}

      {enabled && (
        <button
          type="button"
          onClick={handleTest}
          disabled={busy}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          Send a test reminder
        </button>
      )}

      {message && <p className="text-xs text-muted-foreground mt-2">{message}</p>}
    </section>
  );
}
