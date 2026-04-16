"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const data = new FormData(e.currentTarget);
    try {
      await signIn("password", data);
      router.replace("/today");
    } catch {
      setError(
        mode === "signUp"
          ? "Couldn't create account. Try a different email or a longer password."
          : "Wrong email or password.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-svh flex flex-col justify-between px-6 py-10 sm:px-12 sm:py-16">
      <header className="flex items-baseline justify-between">
        <span className="text-lg font-semibold tracking-tight">Ledger</span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
          {mode === "signIn" ? "Sign in" : "New account"}
        </span>
      </header>

      <section className="mx-auto w-full max-w-sm flex-1 flex flex-col justify-center py-16">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight mb-2">
          {mode === "signIn" ? "Welcome back." : "Create your ledger."}
        </h1>
        <p className="text-ink-soft mb-10 text-[15px] leading-relaxed">
          Track daily work and pay across your clients.
        </p>

        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Email" name="email" type="email" autoComplete="email" />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
          />
          <input type="hidden" name="flow" value={mode} />

          {error && (
            <p className="text-sm text-accent">{error}</p>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={pending}
              className="px-5 py-2.5 bg-ink text-bg rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {pending
                ? mode === "signIn" ? "Signing in…" : "Creating…"
                : mode === "signIn" ? "Sign in" : "Create account"}
            </button>

            <button
              type="button"
              onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
              className="text-sm text-muted hover:text-ink transition-colors"
            >
              {mode === "signIn" ? "Create account" : "Sign in instead"}
            </button>
          </div>
        </form>
      </section>

      <footer className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted">
        <span>Private · login-protected</span>
        <span>Self-hosted</span>
      </footer>
    </main>
  );
}

function Field({ label, name, type, autoComplete }: { label: string; name: string; type: string; autoComplete?: string }) {
  return (
    <label className="block">
      <span className="block text-sm text-ink-soft mb-1.5">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        className="w-full bg-bg-2 border border-border rounded-lg px-3 py-2.5 text-base placeholder:text-muted transition-colors focus:border-foreground/30 outline-none focus-visible:!outline-none"
      />
    </label>
  );
}
