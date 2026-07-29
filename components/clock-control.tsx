"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/cn";
import { formatTimeLabel } from "@/lib/date";
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

type Client = Doc<"clients">;
type Shift = Doc<"shifts">;

const HOUR_CHOICES = [2, 4, 6, 8, 9, 10, 12];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Seconds are shown while a shift runs so it's visibly ticking — h:mm alone
// looks frozen for a full minute at a time.
function formatRunning(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${hours}:${pad(minutes)}:${pad(seconds)}`;
}

function formatTimeOfDay(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function toTimeInput(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromTimeInput(hhmm: string): number | null {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

// Derived from the same clock-in instant the server will store, so the shift
// length works out exact rather than short by the network round-trip.
function computeRemindAt(
  client: Client,
  clockInAt: number,
  hours: number,
): number | undefined {
  if (client.reminderMode === "fixedTime") {
    if (!client.clockOutTime) return undefined;
    const [h, m] = client.clockOutTime.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return undefined;
    const target = new Date(clockInAt);
    target.setHours(h, m, 0, 0);
    return target.getTime();
  }
  return clockInAt + hours * 3600_000;
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hours, setHours] = useState(client.defaultShiftHours ?? 8);
  const [startTime, setStartTime] = useState(() => toTimeInput(Date.now()));
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const shiftId = shift?._id;

  // Keyed on the shift id, not the document — depending on the object meant an
  // unrelated query update could restart the interval before it ever fired.
  useEffect(() => {
    if (!shiftId) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [shiftId]);

  function openSheet() {
    setStartTime(toTimeInput(Date.now()));
    setHours(client.defaultShiftHours ?? 8);
    setSheetOpen(true);
  }

  const startedAt = fromTimeInput(startTime);
  const inFuture = startedAt !== null && startedAt > Date.now();
  const previewRemindAt =
    startedAt !== null && !inFuture
      ? computeRemindAt(client, startedAt, hours)
      : undefined;
  const previewIsPast = previewRemindAt !== undefined && previewRemindAt <= Date.now();

  async function handleClockIn() {
    if (startedAt === null || inFuture) return;
    setBusy(true);
    try {
      await clockIn({
        clientId: client._id,
        shiftDate,
        clockInAt: startedAt,
        remindAt: computeRemindAt(client, startedAt, hours),
      });
      setSheetOpen(false);
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

  const choices = HOUR_CHOICES.includes(hours)
    ? HOUR_CHOICES
    : [...HOUR_CHOICES, hours].sort((a, b) => a - b);

  const sheet = (
    <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Clock in — {client.name}</DrawerTitle>
            <DrawerDescription>
              Starts now unless you change the time.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2 space-y-4">
            <label className="block">
              <span className="text-[11px] text-muted-foreground block mb-1">
                Started at
              </span>
              {/* appearance-none: Safari gives time inputs an intrinsic width
                  and otherwise ignores w-full, leaving them narrower than the
                  other fields. */}
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="block w-full appearance-none bg-secondary border border-input rounded-lg px-4 py-3 text-base tabular-nums outline-none focus:border-foreground/30 focus-visible:!outline-none"
              />
            </label>

            {!fixedMode && (
              <label className="block">
                <span className="text-[11px] text-muted-foreground block mb-1">
                  Shift length
                </span>
                <select
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="block w-full bg-secondary border border-input rounded-lg px-4 py-3 text-base tabular-nums outline-none focus:border-foreground/30 focus-visible:!outline-none"
                >
                  {choices.map((h) => (
                    <option key={h} value={h}>
                      {h}h
                    </option>
                  ))}
                </select>
              </label>
            )}

            <p className="text-xs text-muted-foreground">
              {inFuture
                ? "Pick a time that has already passed."
                : previewRemindAt === undefined || previewIsPast
                  ? "No reminder — that time has already passed."
                  : `Ends at: ${formatTimeOfDay(previewRemindAt)}`}
            </p>
          </div>

          <DrawerFooter>
            <Button
              onClick={handleClockIn}
              disabled={busy || startedAt === null || inFuture}
              size="lg"
            >
              {busy ? "Clocking in…" : "Clock in"}
            </Button>
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

  if (!shift) {
    return (
      <div className="mb-4">
        <button
          type="button"
          onClick={openSheet}
          className="w-full bg-ink text-bg rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Clock in
        </button>
        {fixedMode && client.clockOutTime && (
          <p className="text-[11px] text-muted mt-1.5">
            Reminder at {formatTimeLabel(client.clockOutTime)}
          </p>
        )}
        {sheet}
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
            {formatRunning(elapsed)}
          </span>
          <p className="text-[11px] text-muted mt-0.5">
            Started at: {formatTimeOfDay(shift.clockInAt)}
          </p>
          <p className="text-[11px] text-muted">
            {shift.remindAt
              ? `Ends at: ${formatTimeOfDay(shift.remindAt)}`
              : "No reminder set"}
          </p>
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
