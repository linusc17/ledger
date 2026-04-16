export default function SetupScreen() {
  return (
    <main className="min-h-svh flex flex-col justify-between px-6 py-10 sm:px-12 sm:py-16">
      <header className="flex items-baseline justify-between">
        <span className="text-lg font-semibold tracking-tight">Ledger</span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
          Setup required
        </span>
      </header>

      <section className="mx-auto w-full max-w-xl flex-1 flex flex-col justify-center py-12">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-4">
          One-time setup
        </p>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight mb-4">
          Connect Convex to begin.
        </h1>
        <p className="text-ink-soft max-w-md mb-10 text-[15px] leading-relaxed">
          Ledger stores your data in Convex — a free personal cloud database.
          Run the commands below in this directory.
        </p>

        <ol className="space-y-6 mb-10">
          <Step n="01" title="Run the Convex setup" code="npx convex dev" note="Sign in with GitHub. Creates your project. Leave running." />
          <Step n="02" title="Generate auth keys" code="npx @convex-dev/auth" note="Second terminal. Enter http://localhost:3000 for site URL." />
          <Step n="03" title="Start the app" code="npm run dev" note="Reload this page to get to the login screen." />
        </ol>

        <p className="font-mono text-[10px] uppercase tracking-wider text-muted border-t border-border pt-4">
          See README.md for Vercel deploy steps.
        </p>
      </section>

      <footer className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted">
        <span>Private · login-protected</span>
        <span>Self-hosted</span>
      </footer>
    </main>
  );
}

function Step({ n, title, code, note }: { n: string; title: string; code: string; note: string }) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-4 items-start">
      <span className="font-mono text-[11px] tabular-nums text-muted mt-1">{n}</span>
      <div>
        <h3 className="text-base font-medium mb-2">{title}</h3>
        <pre className="font-mono text-[13px] bg-bg-2 border border-border px-3 py-2 rounded mb-2 overflow-x-auto">
          <code>{code}</code>
        </pre>
        <p className="text-ink-soft text-sm leading-relaxed">{note}</p>
      </div>
    </li>
  );
}
