# Tally

A personal tracker for daily work, income, bills, and spending. Installable as a PWA on iPhone, Android, and Mac.

## Features

- **Daily task tracker** — per-client checklist you tap through each day
- **Income tracker** — scheduled client pay plus one-off income (gifts, refunds, side gigs)
- **Pay day calendar** — tap the days of the month you get paid per client
- **Monthly bills** — recurring bill templates, paid/overdue status
- **Spending tracker** — ad-hoc expenses with custom categories, per-month donut and "saved" math
- **Completion history** — monthly heatmap showing your work streaks
- **Multi-client** — manage as many clients as you need with independent schedules
- **Onboarding wizard** — guided first-time setup with platform-specific install instructions
- **Installable PWA** — add to home screen on iPhone or Android, install on Mac
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
