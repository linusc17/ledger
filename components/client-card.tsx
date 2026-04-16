"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useState, useRef, useEffect } from "react";
import TaskCheckbox from "./task-checkbox";
import { IconNote, IconPlus } from "./icons";
import { cn } from "@/lib/cn";
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
  const setNotesMut = useMutation(api.logs.setNotes);
  const updateTasks = useMutation(api.clients.updateTasks);

  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false);
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [draft, setDraft] = useState(log?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const taskInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(log?.notes ?? "");
  }, [log?.notes]);

  const done = log?.completedTaskIds ?? [];
  const total = client.dailyTasks.length;
  const count = client.dailyTasks.filter((t) => done.includes(t.id)).length;
  const allDone = total > 0 && count === total;

  async function onToggle(taskId: string) {
    await toggle({ clientId: client._id, logDate, taskId });
  }

  async function addTask() {
    if (!newTaskLabel.trim()) return;
    setSaving(true);
    const id =
      newTaskLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20) ||
      `task-${Date.now()}`;
    await updateTasks({
      clientId: client._id,
      dailyTasks: [...client.dailyTasks, { id, label: newTaskLabel.trim() }],
    });
    setNewTaskLabel("");
    setSaving(false);
    setTaskDrawerOpen(false);
  }

  async function saveNotes() {
    if ((log?.notes ?? "") === draft) {
      setNoteDrawerOpen(false);
      return;
    }
    setSaving(true);
    await setNotesMut({ clientId: client._id, logDate, notes: draft });
    setSaving(false);
    setNoteDrawerOpen(false);
  }

  return (
    <>
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

        {total > 0 && (
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
        )}

        <div className={cn("flex items-center gap-3", total > 0 && "mt-3 pt-2 border-t border-border/50")}>
          <button
            type="button"
            onClick={() => {
              setTaskDrawerOpen(true);
              setTimeout(() => taskInputRef.current?.focus(), 200);
            }}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
          >
            <IconPlus width={12} height={12} strokeWidth={1.5} />
            Add task
          </button>
          <button
            type="button"
            onClick={() => {
              setNoteDrawerOpen(true);
              setTimeout(() => noteInputRef.current?.focus(), 200);
            }}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
          >
            <IconNote width={12} height={12} strokeWidth={1.3} />
            {log?.notes ? "Edit note" : "Note"}
          </button>
        </div>
      </article>

      <Drawer open={taskDrawerOpen} onOpenChange={setTaskDrawerOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle>Add task — {client.name}</DrawerTitle>
              <DrawerDescription>This task will appear in your daily checklist.</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-2">
              <input
                ref={taskInputRef}
                value={newTaskLabel}
                onChange={(e) => setNewTaskLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="e.g. Submit daily report"
                className="w-full bg-secondary border border-input rounded-lg px-4 py-3 text-base placeholder:text-muted-foreground outline-none focus:border-foreground/30 focus-visible:!outline-none"
              />
            </div>
            <DrawerFooter>
              <Button onClick={addTask} disabled={!newTaskLabel.trim() || saving} size="lg">
                {saving ? "Adding…" : "Add task"}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" size="lg">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={noteDrawerOpen} onOpenChange={setNoteDrawerOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle>Note — {client.name}</DrawerTitle>
              <DrawerDescription>A quick note for today.</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-2">
              <textarea
                ref={noteInputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="What's on your mind…"
                rows={4}
                className="w-full bg-secondary border border-input rounded-lg px-4 py-3 text-base placeholder:text-muted-foreground outline-none focus:border-foreground/30 resize-none focus-visible:!outline-none"
              />
            </div>
            <DrawerFooter>
              <Button onClick={saveNotes} disabled={saving} size="lg">
                {saving ? "Saving…" : "Save note"}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" size="lg">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
