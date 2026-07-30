# Tally motion design

**Date:** 2026-07-30
**Status:** approved, implementing

## Goal

Make Tally feel like a native app rather than a website, primarily through motion. The user's hard requirement: **tapping a tab must be instant *and* animated**. A transition that delays the content is worse than no transition.

This replaces the abandoned SwiftUI rewrite. The web app is the product.

## The real problem

Animation is the visible half of the work. The invisible half matters more.

Every tab fires 2–4 Convex `useQuery` calls (`today` 4, `income` 4, `spending` 4, `bills` 3, `balances` 2). On tab switch the page component mounts fresh, those queries return `undefined`, and the page renders skeletons before content. Sliding a skeleton into view feels *slower* than a hard cut, because the wait becomes something you watch.

So "instant" is two separate fixes:

1. **Warm data** so the incoming tab paints real content on frame one.
2. **Directional motion** so the eye tracks where it went.

Both are required. Neither is sufficient.

## Architecture

### 1. Motion tokens

Duration and easing live as CSS custom properties in `globals.css`, so timing is consistent and tunable in one place.

| Token | Value | Used for |
|---|---|---|
| `--dur-fast` | 120ms | Press feedback, checkbox |
| `--dur-base` | 220ms | Most enter/exit |
| `--dur-page` | 280ms | Page transitions |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default — decelerating, iOS-like |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Overshoot for confirmations |

### 2. Navigation — native View Transitions

Not React's `<ViewTransition>`: Next 16.2.3 exposes `experimental.viewTransition`, but React 19.2.4 stable exports no `ViewTransition` component. Using it would mean moving to a React experimental build — unjustifiable for an app in daily personal use. The browser API needs no experimental dependency and degrades cleanly.

**Direction** comes from tab order. The canonical `TABS` array moves out of `bottom-nav.tsx` into `lib/tabs.ts` so both the nav and the navigation hook read one source. Navigating to a higher index is `forward`, lower is `back`.

**`useTabNavigation`** (`lib/use-tab-navigation.ts`):

- Returns a `navigate(href)` callback.
- No-ops when `href` matches the current pathname — otherwise the transition promise never settles and the browser stalls on its 4s timeout.
- Falls back to a plain `router.push` when `document.startViewTransition` is absent or the user prefers reduced motion.
- Otherwise sets `document.documentElement.dataset.nav` to the direction, then calls `startViewTransition` with a callback returning a promise resolved by a `usePathname` effect once the route actually commits.
- Clears the `data-nav` attribute on `transition.finished`.

**CSS** targets the pseudo-elements, keyed off `data-nav`:

```
html[data-nav="forward"]::view-transition-old(root) → slide out to left
html[data-nav="forward"]::view-transition-new(root) → slide in from right
html[data-nav="back"]                               → mirrored
```

The bottom nav gets its own `view-transition-name` so it is lifted out of the root snapshot and stays planted while content slides beneath it. Without this the nav would slide with the page and the illusion collapses.

### 3. Warm queries

`app/(app)/WarmQueries.tsx` — a client component rendering `null`, mounted in `app/(app)/layout.tsx`. It subscribes to every tab-level query.

Because it lives in the layout it never unmounts during tab navigation, so subscriptions stay live. Convex's client returns a cached result synchronously to any later subscriber of the same (query, args) pair, so a page mounting mid-transition renders content immediately instead of `undefined`.

Args must match the pages exactly or the cache misses: `logs.forDay` needs `todayLocal()`, and `spending.listMonth` / `otherIncome.listMonth` need `monthOf(todayLocal())`. `monthOf` is currently duplicated in `income/page.tsx` and `spending/page.tsx`; it moves to `lib/date.ts` and all three import it.

Skeletons stay for genuine cold start — they are correct there, just wrong on every subsequent tab switch.

Spending's month picker can move off the current month; that state is page-local, so a non-current month legitimately loads. Only the default month is warmed.

### 4. Interaction surfaces

- **Lists that change** — `AnimatedList` keeps removed children mounted for one exit animation (grid-row collapse plus fade) before dropping them, and animates new keys in. Applied to bills, spending entries, other income, categories, accounts.
- **Numbers** — `AnimatedNumber` tweens between values with `requestAnimationFrame` and eases out. Applied to balances, spending totals, income totals. Formatting stays with the existing `peso` helpers.
- **Drawers** — content inside sheets staggers in rather than hard-cutting with the sheet.
- **Press states** — a global `:active` scale on tappable elements.

### 5. Reduced motion

The app currently has zero `prefers-reduced-motion` handling, and full-width directional slides are exactly the motion class that causes vestibular problems. Every animation gets a reduced-motion branch collapsing to a short opacity fade; page transitions bypass the View Transition entirely. Handled both in CSS and read in JS by the navigation hook.

## Testing

No test infrastructure exists in this repo, and motion is largely unassertable in unit tests. Verification is:

- `npm run build` and `npm run lint` clean.
- Manual pass in the browser: each tab pair both directions, reduced-motion enabled, and a hard reload on each tab to confirm skeletons still appear on genuine cold start.

## Out of scope

Swipe-between-tabs gestures, shared-element morphs from card to drawer, and spring physics. All are reachable from this foundation later; none are needed for the app to stop feeling like a webpage.
