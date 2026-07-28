"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/cn";
import { formatTimeLabel } from "@/lib/date";

type Client = Doc<"clients">;
type Shift = Doc<"shifts">;

const HOUR_CHOICES = [2, 4, 6, 8, 9, 10, 12];

function formatElapsed(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function formatTimeOfDay(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

// The device resolves the reminder instant, which is why Tally never stores a
// timezone: "today at 5:00 PM" only has meaning where the clock-in happened.
function computeRemindAt(client: Client, hours: number): number | undefined {
  const now = Date.now();
  if (client.reminderMode === "fixedTime") {
    if (!client.clockOutTime) return undefined;
    const [h, m] = client.clockOutTime.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return undefined;
    const target = new Date();
    target.setHours(h, m, 0, 0);
    return target.getTime() > now ? target.getTime() : undefined;
  }
  return now + hours * 3600_000;
}

export default function ClockControl({
  client,
  shift,
  shiftDate,
}: {
  client: Client;
  shift: Shift | undefined;
  shiftDate: string;
}) {
  const clockIn = useMutation(api.shifts.clockIn);
  const clockOut = useMutation(api.shifts.clockOut);

  const fixedMode = client.reminderMode === "fixedTime";
  const [hours, setHours] = useState(client.defaultShiftHours ?? 8);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setHours(client.defaultShiftHours ?? 8);
  }, [client.defaultShiftHours]);

  // Only tick while a shift is running, and only every 15s — the readout is
  // h:mm, so a faster interval would burn battery for nothing.
  useEffect(() => {
    if (!shift) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [shift]);

  async function handleClockIn() {
    setBusy(true);
    try {
      await clockIn({
        clientId: client._id,
        shiftDate,
        remindAt: computeRemindAt(client, hours),
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleClockOut() {
    if (!shift) return;
    setBusy(true);
    try {
      await clockOut({ shiftId: shift._id });
    } finally {
      setBusy(false);
    }
  }

  if (!shift) {
    const choices = HOUR_CHOICES.includes(hours)
      ? HOUR_CHOICES
      : [...HOUR_CHOICES, hours].sort((a, b) => a - b);

    return (
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClockIn}
            disabled={busy}
            className="flex-1 bg-ink text-bg rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {busy ? "Clocking in…" : fixedMode ? "Clock in" : `Clock in · ${hours}h`}
          </button>
          {!fixedMode && (
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              aria-label="Shift length for today"
              className="bg-bg border border-border rounded-lg px-2.5 py-2.5 text-sm tabular-nums outline-none focus:border-foreground/30 focus-visible:!outline-none"
            >
              {choices.map((h) => (
                <option key={h} value={h}>
                  {h}h
                </option>
              ))}
            </select>
          )}
        </div>
        {fixedMode && client.clockOutTime && (
          <p className="text-[11px] text-muted mt-1.5">
            Reminder at {formatTimeLabel(client.clockOutTime)}
          </p>
        )}
      </div>
    );
  }

  const elapsed = now - shift.clockInAt;
  const total = shift.remindAt ? shift.remindAt - shift.clockInAt : undefined;
  const pct = total ? Math.min(100, (elapsed / total) * 100) : 0;
  const overdue = shift.remindAt ? now >= shift.remindAt : false;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span
            className={cn(
              "font-mono text-lg tabular-nums",
              overdue ? "text-accent" : "text-ink",
            )}
          >
            {formatElapsed(elapsed)}
          </span>
          <span className="text-xs text-muted ml-2">
            {shift.remindAt
              ? fixedMode
                ? `until ${formatTimeOfDay(shift.remindAt)}`
                : `/ ${formatElapsed(total ?? 0)}`
              : "no reminder"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleClockOut}
          disabled={busy}
          className="shrink-0 border border-border rounded-lg px-4 py-2 text-sm font-medium hover:bg-bg transition-colors disabled:opacity-50"
        >
          {busy ? "Clocking out…" : "Clock out"}
        </button>
      </div>
      {shift.remindAt && (
        <div className="h-1 bg-bg rounded-full mt-2.5 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              overdue ? "bg-accent" : "bg-ink",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
