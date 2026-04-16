"use client";

import { useEffect, useState } from "react";
import { IconCheck } from "./icons";
import { cn } from "@/lib/cn";

type Props = {
  checked: boolean;
  label: string;
  onToggle: () => Promise<void> | void;
};

export default function TaskCheckbox({ checked, label, onToggle }: Props) {
  const [local, setLocal] = useState(checked);

  useEffect(() => {
    setLocal(checked);
  }, [checked]);

  function handle() {
    setLocal(!local);
    void onToggle();
  }

  return (
    <button
      type="button"
      onClick={handle}
      className="group/task flex items-center gap-3 w-full text-left py-2 rounded-lg hover:bg-bg/50 transition-colors -mx-1 px-1"
    >
      <span
        className={cn(
          "shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150",
          local
            ? "bg-ink border-ink"
            : "border-border group-hover/task:border-ink-soft",
        )}
        aria-hidden="true"
      >
        {local && (
          <IconCheck
            className="check-enter"
            width={12}
            height={12}
            strokeWidth={2.5}
            style={{ color: "var(--bg)" }}
          />
        )}
      </span>
      <span
        className={cn(
          "text-[15px] transition-colors flex-1",
          local ? "text-muted line-through" : "text-ink",
        )}
      >
        {label}
      </span>
    </button>
  );
}
