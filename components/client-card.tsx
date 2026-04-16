"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useState, useRef } from "react";
import TaskCheckbox from "./task-checkbox";
import { IconNote, IconPlus } from "./icons";
import { cn } from "@/lib/cn";

type Client = Doc<"clients">;
type Log = Doc<"dailyLogs"> | undefined;

export default function ClientCard({
  client,
  log,
  logDate,
  index,
}: {
  client: Client;
  log: Log;
  logDate: string;
  index: number;
}) {
  const toggle = useMutation(api.logs.toggleTask);
  const setNotes = useMutation(api.logs.setNotes);
  const updateTasks = useMutation(api.clients.updateTasks);
  const [notesOpen, setNotesOpen] = useState(false);
  const [draft, setDraft] = useState(log?.notes ?? "");
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  const done = log?.completedTaskIds ?? [];
  const total = client.dailyTasks.length;
  const count = client.dailyTasks.filter((t) => done.includes(t.id)).length;
  const allDone = total > 0 && count === total;

  async function onToggle(taskId: string) {
    await toggle({ clientId: client._id, logDate, taskId });
  }

  async function saveNotes() {
    if ((log?.notes ?? "") === draft) return;
    await setNotes({ clientId: client._id, logDate, notes: draft });
  }

  return (
    <article
      className={cn("fade-in bg-bg-2 rounded-xl p-5", `fade-in-${Math.min(index + 1, 4)}`)}
    >
      <header className="flex items-center justify-between mb-3">
        <h2 className={cn("text-lg font-semibold", allDone && "text-ink-soft")}>
          {client.name}
        </h2>
        <span className={cn(
          "font-mono text-xs tabular-nums",
          allDone ? "text-success" : "text-muted",
        )}>
          {count}/{total}
        </span>
      </header>

      {total > 0 ? (
        <ul className="space-y-0.5">
          {client.dailyTasks.map((task) => (
            <li key={task.id}>
              <TaskCheckbox
                checked={done.includes(task.id)}
                label={task.label}
                onToggle={() => onToggle(task.id)}
              />
            </li>
          ))}
        </ul>
      ) : !addingTask ? (
        <button
          type="button"
          onClick={() => {
            setAddingTask(true);
            setTimeout(() => addInputRef.current?.focus(), 50);
          }}
          className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors py-2"
        >
          <IconPlus width={14} height={14} strokeWidth={1.5} />
          Add a task
        </button>
      ) : null}

      {addingTask && (
        <div className="flex items-center gap-2 drawer-enter py-1">
          <input
            ref={addInputRef}
            value={newTaskLabel}
            onChange={(e) => setNewTaskLabel(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && newTaskLabel.trim()) {
                const id = newTaskLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20) || `task-${Date.now()}`;
                await updateTasks({
                  clientId: client._id,
                  dailyTasks: [...client.dailyTasks, { id, label: newTaskLabel.trim() }],
                });
                setNewTaskLabel("");
              }
              if (e.key === "Escape") {
                setAddingTask(false);
                setNewTaskLabel("");
              }
            }}
            placeholder="Task name"
            className="flex-1 min-w-0 bg-transparent border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted outline-none focus:border-foreground/30 focus-visible:!outline-none"
          />
          <button
            type="button"
            onClick={() => { setAddingTask(false); setNewTaskLabel(""); }}
            className="text-xs text-muted hover:text-ink transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-border/50">
        <button
          type="button"
          onClick={() => setNotesOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
        >
          <IconNote width={12} height={12} strokeWidth={1.3} />
          {log?.notes ? "Edit note" : "Add note"}
        </button>

        {notesOpen && (
          <div className="drawer-enter mt-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={saveNotes}
              placeholder="Quick note for the day…"
              rows={2}
              className="w-full bg-transparent text-sm text-ink-soft border border-border rounded-lg px-3 py-2 focus:border-foreground/30 outline-none placeholder:text-muted resize-none focus-visible:!outline-none"
            />
          </div>
        )}
      </div>
    </article>
  );
}
