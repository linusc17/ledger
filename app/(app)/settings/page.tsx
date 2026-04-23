"use client";

import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { IconPlus, IconX, IconSignOut } from "@/components/icons";
import { Button } from "@/components/ui/button";
import DayPicker from "@/components/day-picker";
import { cn } from "@/lib/cn";
import { SkeletonList } from "@/components/skeleton";
import { useRouter } from "next/navigation";
import { ordinal } from "@/lib/date";

type Client = Doc<"clients">;

export default function SettingsPage() {
  const clients = useQuery(api.clients.listMine);
  const createClient = useMutation(api.clients.create);
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [newName, setNewName] = useState("");

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  async function addClient() {
    if (!newName.trim()) return;
    await createClient({
      name: newName.trim(),
      dailyTasks: [{ id: "task", label: "Do today's task" }],
    });
    setNewName("");
  }

  return (
    <main className="mx-auto max-w-xl px-5 pt-6 sm:px-8 sm:pt-10">
      <header className="flex items-baseline justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted mt-1">Clients, tasks, and pay schedules</p>
        </div>
      </header>

      <section className="space-y-6">
        {clients === undefined ? (
          <SkeletonList count={3} />
        ) : (
          clients.map((c, i) => (
            <ClientEditor key={c._id} client={c} index={i} />
          ))
        )}
      </section>

      <section className="mt-8 bg-bg-2 rounded-xl p-5">
        <h3 className="text-sm font-medium text-muted mb-3">Add a client</h3>
        <div className="flex items-center gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addClient()}
            placeholder="Client name"
            className="flex-1 bg-bg border border-border rounded-lg px-3 py-2.5 text-base placeholder:text-muted focus:border-foreground/30 outline-none focus-visible:!outline-none"
          />
          <button
            type="button"
            onClick={addClient}
            className="px-4 py-2.5 bg-ink text-bg rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Add
          </button>
        </div>
      </section>

      <section className="mt-12 mb-8 border-t border-border pt-8">
        <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-4">Account</h3>
        <Button
          variant="outline"
          size="lg"
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          onClick={handleSignOut}
        >
          <IconSignOut width={16} height={16} strokeWidth={1.4} />
          Sign out
        </Button>
      </section>
    </main>
  );
}

function ClientEditor({ client, index }: { client: Client; index: number }) {
  const updateName = useMutation(api.clients.updateName);
  const updateTasks = useMutation(api.clients.updateTasks);
  const updatePay = useMutation(api.clients.updatePay);
  const removeClient = useMutation(api.clients.remove);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(client.name);
  const [tasks, setTasks] = useState(client.dailyTasks);
  const [newTask, setNewTask] = useState("");
  const [payDays, setPayDays] = useState<number[]>(client.payDays ?? []);
  const [amount, setAmount] = useState(client.defaultAmount?.toString() ?? "");
  const [confirmRemove, setConfirmRemove] = useState(false);

  async function saveName() {
    if (name.trim() && name !== client.name) {
      await updateName({ clientId: client._id, name: name.trim() });
    }
  }

  async function saveTasks(next: typeof tasks) {
    setTasks(next);
    await updateTasks({ clientId: client._id, dailyTasks: next });
  }

  async function addTask() {
    if (!newTask.trim()) return;
    const id = newTask.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20) || `task-${Date.now()}`;
    await saveTasks([...tasks, { id, label: newTask.trim() }]);
    setNewTask("");
  }

  async function removeTask(id: string) {
    await saveTasks(tasks.filter((t) => t.id !== id));
  }

  async function renameTask(id: string, label: string) {
    await saveTasks(tasks.map((t) => (t.id === id ? { ...t, label } : t)));
  }

  async function savePayDays(days: number[]) {
    setPayDays(days);
    const amt = parseFloat(amount);
    await updatePay({
      clientId: client._id,
      payDays: days.length > 0 ? days : [15],
      defaultAmount: !isNaN(amt) && amt > 0 ? amt : undefined,
    });
  }

  async function saveAmount() {
    const amt = parseFloat(amount);
    await updatePay({
      clientId: client._id,
      payDays: payDays.length > 0 ? payDays : [15],
      defaultAmount: !isNaN(amt) && amt > 0 ? amt : undefined,
    });
  }

  const taskSummary = tasks.length === 0
    ? "No tasks"
    : tasks.length === 1
      ? "1 task"
      : `${tasks.length} tasks`;
  const paySummary = payDays.length === 0
    ? "No pay days set"
    : `Paid on the ${payDays.map(ordinal).join(" & ")}`;

  if (!editing) {
    return (
      <article className={cn("fade-in bg-bg-2 rounded-xl p-4", `fade-in-${Math.min(index + 1, 4)}`)}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate">{client.name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {taskSummary} · {paySummary}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-bg"
            >
              Edit
            </button>
            {!confirmRemove ? (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors px-3 py-1.5 rounded-lg hover:bg-bg"
              >
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => removeClient({ clientId: client._id })}
                  className="text-xs text-destructive px-2 py-1.5"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRemove(false)}
                  className="text-xs text-muted-foreground px-2 py-1.5"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={cn("fade-in bg-bg-2 rounded-xl p-5 drawer-enter", `fade-in-${Math.min(index + 1, 4)}`)}>
      <div className="flex items-center justify-between mb-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          className="text-lg font-semibold bg-transparent border-0 border-b border-transparent hover:border-border focus:border-foreground/30 outline-none py-0.5 flex-1 min-w-0 focus-visible:!outline-none"
        />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-bg shrink-0 ml-3"
        >
          Done
        </button>
      </div>

      <div className="mb-5">
        <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Daily tasks</h4>
        <ul className="space-y-1">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <input
                defaultValue={t.label}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== t.label) renameTask(t.id, v);
                }}
                className="flex-1 bg-transparent border-b border-transparent hover:border-border focus:border-foreground/30 outline-none py-1.5 text-sm focus-visible:!outline-none"
              />
              <button
                type="button"
                onClick={() => removeTask(t.id)}
                className="text-muted hover:text-accent transition-colors p-1"
              >
                <IconX width={14} height={14} strokeWidth={1.4} />
              </button>
            </li>
          ))}
          <li className="flex items-center gap-2 pt-1">
            <IconPlus width={14} height={14} className="text-muted" strokeWidth={1.4} />
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="Add task"
              className="flex-1 bg-transparent border-b border-transparent hover:border-border focus:border-foreground/30 outline-none py-1.5 text-sm text-ink-soft placeholder:text-muted focus-visible:!outline-none"
            />
          </li>
        </ul>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">Pay days</h4>
        <DayPicker selected={payDays} onChange={savePayDays} />
        <label className="block mt-4">
          <span className="text-[11px] text-muted-foreground block mb-1">Default amount per pay day (₱)</span>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={amount}
            placeholder="Optional"
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            onBlur={saveAmount}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-foreground/30 tabular-nums placeholder:text-muted focus-visible:!outline-none"
          />
        </label>
      </div>
    </article>
  );
}
