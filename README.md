# Ledger

Track daily work and salary across your clients. Installable as a PWA on iPhone and Mac.

## Features

- **Daily task tracker** — per-client checklist you tap through each day
- **Salary tracker** — log payments as they come in, see what's outstanding and overdue
- **Pay day calendar** — tap the days of the month you get paid per client
- **Completion history** — monthly heatmap showing your work streaks
- **Multi-client** — manage as many clients as you need with independent schedules
- **Onboarding wizard** — guided first-time setup for your first client
- **Installable PWA** — add to home screen on iPhone, install on Mac
- **Real-time sync** — updates across devices instantly via Convex
- **Philippine Peso** — amounts displayed in ₱

## Tech

- Next.js 16, TypeScript, Tailwind v4
- Convex (database, real-time sync, auth)
- shadcn/ui components
- DM Sans + JetBrains Mono

## Getting Started

```bash
npm install
npx convex dev
npx @convex-dev/auth
npm run dev
```

## Deploy

Push to GitHub, import on Vercel. Set `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`, `JWT_PRIVATE_KEY`, `JWKS`, and `SITE_URL` as environment variables. Use `npx convex deploy --cmd 'next build'` as the build command.
