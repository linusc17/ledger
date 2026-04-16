"use client";

import { cn } from "@/lib/cn";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function DayPicker({
  selected,
  onChange,
}: {
  selected: number[];
  onChange: (days: number[]) => void;
}) {
  function toggle(day: number) {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day].sort((a, b) => a - b));
    }
  }

  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const active = selected.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggle(day)}
              className={cn(
                "aspect-square rounded-lg text-sm tabular-nums font-medium transition-all duration-150 active:scale-90",
                active
                  ? "bg-foreground/15 text-foreground border border-foreground/40 scale-105"
                  : "bg-secondary text-muted-foreground border border-transparent hover:bg-secondary/80 hover:text-foreground",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground mt-4 min-h-[20px]">
        {selected.length === 0
          ? "Tap the days you get paid"
          : `Paid on the ${selected.map(ordinal).join(" & ")}`}
      </p>
    </div>
  );
}
