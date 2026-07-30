"use client";

import { Children, isValidElement, useEffect, useState, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/cn";

// Must outlast the `list-item-out` animation in globals.css (--dur-base), or
// rows get yanked from the DOM part-way through collapsing.
const EXIT_MS = 240;

type Departing = { key: string; index: number; node: ReactNode };

type Snapshot = {
  keys: string[];
  nodes: Map<string, ReactNode>;
  entering: string[];
  departing: Departing[];
};

function sameKeys(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((key, i) => key === b[i]);
}

function snapshotOf(items: ReactElement[]): Pick<Snapshot, "keys" | "nodes"> {
  return {
    keys: items.map((item) => String(item.key)),
    nodes: new Map(items.map((item) => [String(item.key), item as ReactNode])),
  };
}

/**
 * Animates children in as they are added and out as they are removed.
 *
 * React drops removed children immediately, so a row logged or deleted just
 * blinks out of existence. This keeps the removed node mounted for one exit
 * animation before letting it go.
 *
 * Children must be keyed, and keys must be stable — rows are identified purely
 * by key. Index keys will animate the wrong rows.
 */
export default function AnimatedList({
  children,
  className,
  as: Wrapper = "div",
}: {
  children: ReactNode;
  className?: string;
  /** Use "li" inside a <ul>; a <div> there would be invalid markup. */
  as?: "div" | "li";
}) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement[];
  const keys = items.map((item) => String(item.key));

  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({
    ...snapshotOf(items),
    entering: [],
    departing: [],
  }));

  // Adjusting state during render rather than in an effect: this is derived
  // from the children we were just handed, and an effect would paint one frame
  // with the row already gone before the exit animation could start.
  if (!sameKeys(snapshot.keys, keys)) {
    const live = new Set(keys);
    const removed: Departing[] = snapshot.keys
      .filter((key) => !live.has(key))
      .map((key) => ({
        key,
        node: snapshot.nodes.get(key),
        index: snapshot.keys.indexOf(key),
      }));

    setSnapshot({
      ...snapshotOf(items),
      entering: keys.filter((key) => !snapshot.nodes.has(key)),
      // A row removed and re-added before its exit finished should not render
      // twice under the same key.
      departing: [...snapshot.departing.filter((d) => !live.has(d.key)), ...removed],
    });
  }

  const departing = snapshot.departing;

  useEffect(() => {
    if (departing.length === 0) return;
    const timer = window.setTimeout(() => {
      setSnapshot((current) => ({ ...current, departing: [] }));
    }, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [departing]);

  const rows: { key: string; node: ReactNode; state: "idle" | "entering" | "exiting" }[] = items.map(
    (item) => ({
      key: String(item.key),
      node: item,
      state: snapshot.entering.includes(String(item.key)) ? "entering" : "idle",
    }),
  );

  for (const gone of [...departing].filter((d) => !keys.includes(d.key)).sort((a, b) => a.index - b.index)) {
    rows.splice(Math.min(gone.index, rows.length), 0, {
      key: gone.key,
      node: gone.node,
      state: "exiting",
    });
  }

  return (
    <>
      {rows.map(({ key, node, state }) => (
        <Wrapper key={key} className={cn("list-row", className)} data-state={state}>
          <div>{node}</div>
        </Wrapper>
      ))}
    </>
  );
}
