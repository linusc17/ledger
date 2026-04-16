"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconPlus, IconX, IconArrow } from "@/components/icons";
import DayPicker from "@/components/day-picker";

type Step = "welcome" | "name" | "tasks" | "pay";

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [dir, setDir] = useState<"forward" | "back">("forward");

  const [clientName, setClientName] = useState("");
  const [tasks, setTasks] = useState<{ id: string; label: string }[]>([]);
  const [payDays, setPayDays] = useState<number[]>([]);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const createClient = useMutation(api.clients.create);
  const completeOnboarding = useMutation(api.profile.completeOnboarding);
  const generatePay = useMutation(api.pay.generateMissing);
  const router = useRouter();

  function go(next: Step, direction: "forward" | "back" = "forward") {
    setDir(direction);
    setStep(next);
  }

  async function finish() {
    setSaving(true);
    await createClient({
      name: clientName.trim(),
      dailyTasks: tasks,
      payDays: payDays.length > 0 ? payDays : [15],
      defaultAmount: parseFloat(amount) > 0 ? parseFloat(amount) : undefined,
    });
    await generatePay();
    await completeOnboarding();
    router.replace("/today");
  }

  const steps: Step[] = ["welcome", "name", "tasks", "pay"];
  const currentIndex = steps.indexOf(step);
  const totalSteps = steps.length - 1;

  const slideClass =
    dir === "forward"
      ? "animate-[slide-in-right_280ms_ease-out]"
      : "animate-[slide-in-left_280ms_ease-out]";

  return (
    <main className="min-h-svh flex flex-col px-8 sm:px-10">
      {step !== "welcome" && (
        <div className="mx-auto w-full max-w-sm pt-[max(env(safe-area-inset-top),1.5rem)] flex items-center justify-between gap-4">
          <BackButton onClick={() => {
            const prev = steps[currentIndex - 1];
            if (prev) go(prev, "back");
          }} />
          <div className="flex-1">
            <div className="h-[3px] bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${(currentIndex / totalSteps) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
            {currentIndex}/{totalSteps}
          </span>
        </div>
      )}

      <div className="mx-auto w-full max-w-sm flex-1 flex flex-col justify-center py-8">

        {step === "welcome" && (
          <Welcome onStart={() => go("name")} />
        )}
        {step === "name" && (
          <div key="name" className={slideClass}>
            <NameStep
              value={clientName}
              onChange={setClientName}
              onNext={() => go("tasks")}
            />
          </div>
        )}
        {step === "tasks" && (
          <div key="tasks" className={slideClass}>
            <TasksStep
              clientName={clientName}
              tasks={tasks}
              setTasks={setTasks}
              onNext={() => go("pay")}
            />
          </div>
        )}
        {step === "pay" && (
          <div key="pay" className={slideClass}>
            <PayStep
              clientName={clientName}
              payDays={payDays}
              setPayDays={setPayDays}
              amount={amount}
              setAmount={setAmount}
              onFinish={finish}
              saving={saving}
            />
          </div>
        )}
      </div>
    </main>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="fade-in text-center">
      <div className="w-14 h-14 rounded-2xl bg-foreground text-background flex items-center justify-center text-xl font-semibold mx-auto mb-5">
        L
      </div>
      <h1 className="text-[28px] font-semibold tracking-tight leading-tight mb-2">
        Set up your ledger
      </h1>
      <p className="text-muted-foreground text-[15px] max-w-[280px] mx-auto leading-relaxed mb-10">
        Track your daily work and when you get paid. Takes under a minute.
      </p>
      <Button size="lg" onClick={onStart} className="px-8">
        Get started
        <IconArrow width={16} height={16} className="ml-1" strokeWidth={1.5} />
      </Button>
    </div>
  );
}

function NameStep({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <h2 className="text-[22px] font-semibold tracking-tight leading-tight mb-1.5">
        Who do you work for?
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        Your first client or company. Add more later in Settings.
      </p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && value.trim() && onNext()}
        placeholder="e.g. Acme Corp"
        autoFocus
        className="w-full bg-secondary border border-input rounded-lg px-4 py-3 text-base placeholder:text-muted-foreground outline-none focus:border-foreground/30 focus-visible:!outline-none mb-6"
      />
      <div className="pt-6">
        <Button size="lg" className="w-full" disabled={!value.trim()} onClick={onNext}>
          Next
          <IconArrow width={16} height={16} className="ml-1" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}

function TasksStep({
  clientName,
  tasks,
  setTasks,
  onNext,
}: {
  clientName: string;
  tasks: { id: string; label: string }[];
  setTasks: (t: { id: string; label: string }[]) => void;
  onNext: () => void;
}) {
  const [newTask, setNewTask] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function add() {
    if (!newTask.trim()) return;
    const id =
      newTask.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20) ||
      `task-${Date.now()}`;
    setTasks([...tasks, { id, label: newTask.trim() }]);
    setNewTask("");
    inputRef.current?.focus();
  }

  function remove(taskId: string) {
    setTasks(tasks.filter((t) => t.id !== taskId));
  }

  return (
    <div>
      <h2 className="text-[22px] font-semibold tracking-tight leading-tight mb-1.5">
        What do you do for {clientName}?
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        Add daily tasks to check off, or skip for now.
      </p>

      {tasks.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {tasks.map((t, i) => (
            <li
              key={t.id}
              className="fade-in flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2.5"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <span className="text-sm">{t.label}</span>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
              >
                <IconX width={14} height={14} strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 mb-6">
        <input
          ref={inputRef}
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a task"
          autoFocus
          className="flex-1 min-w-0 bg-secondary border border-input rounded-lg px-3 py-3 text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/30 focus-visible:!outline-none"
        />
        <Button
          onClick={add}
          disabled={!newTask.trim()}
          variant="outline"
          className="shrink-0 h-[46px] w-[46px] p-0"
        >
          <IconPlus width={18} height={18} strokeWidth={1.5} />
        </Button>
      </div>

      <div className="pt-6">
        <Button size="lg" className="w-full" onClick={onNext}>
          {tasks.length === 0 ? "Skip for now" : "Next"}
          <IconArrow width={16} height={16} className="ml-1" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}

function PayStep({
  clientName,
  payDays,
  setPayDays,
  amount,
  setAmount,
  onFinish,
  saving,
}: {
  clientName: string;
  payDays: number[];
  setPayDays: (d: number[]) => void;
  amount: string;
  setAmount: (v: string) => void;
  onFinish: () => void;
  saving: boolean;
}) {
  return (
    <div>
      <h2 className="text-[22px] font-semibold tracking-tight leading-tight mb-1.5">
        When does {clientName} pay you?
      </h2>
      <p className="text-muted-foreground text-sm mb-5">
        Tap the day(s) of the month you receive payment.
      </p>

      <DayPicker selected={payDays} onChange={setPayDays} />

      <label className="block mt-6 mb-8">
        <span className="text-xs text-muted-foreground block mb-1.5">
          Usual amount per pay day (₱)
        </span>
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="Optional"
          className="w-full bg-secondary border border-input rounded-lg px-3 py-3 text-sm tabular-nums placeholder:text-muted-foreground outline-none focus:border-foreground/30 focus-visible:!outline-none"
        />
      </label>

      <div className="pt-6">
        <Button
          size="lg"
          className="w-full"
          disabled={payDays.length === 0 || saving}
          onClick={onFinish}
        >
          {saving ? "Setting up…" : "Start using Ledger"}
          {!saving && <IconArrow width={16} height={16} className="ml-1" strokeWidth={1.5} />}
        </Button>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
    >
      ←
    </button>
  );
}
