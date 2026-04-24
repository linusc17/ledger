import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

function toIso(y: number, m: number, d: number): string {
  const last = new Date(y, m + 1, 0).getDate();
  const clamped = Math.min(d, last);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(clamped).padStart(2, "0")}`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function reconcileClientPeriods(
  ctx: MutationCtx,
  client: Doc<"clients">,
): Promise<number> {
  if (!client.payDays || client.payDays.length === 0) return 0;

  const now = new Date();
  const today = todayIso();

  const validDates = new Set<string>();
  for (let offset = 0; offset <= 1; offset++) {
    let y = now.getFullYear();
    let m = now.getMonth() + offset;
    if (m > 11) { y++; m -= 12; }
    for (const day of client.payDays) {
      validDates.add(toIso(y, m, day));
    }
  }

  const existing = await ctx.db
    .query("payPeriods")
    .withIndex("by_client_date", (q) => q.eq("clientId", client._id))
    .collect();

  const keptDates = new Set<string>();
  for (const p of existing) {
    const stale = !p.received && p.payDate >= today && !validDates.has(p.payDate);
    if (stale) {
      await ctx.db.delete(p._id);
    } else {
      keptDates.add(p.payDate);
    }
  }

  let created = 0;
  for (const payDate of validDates) {
    if (keptDates.has(payDate)) continue;
    await ctx.db.insert("payPeriods", {
      userId: client.userId,
      clientId: client._id,
      payDate,
      amount: client.defaultAmount,
      received: false,
    });
    created++;
  }

  return created;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("payPeriods")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.sort((a, b) => (a.payDate < b.payDate ? 1 : -1));
  },
});

export const generateMissing = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    let created = 0;
    for (const client of clients) {
      created += await reconcileClientPeriods(ctx, client);
    }
    return { created };
  },
});

export const markReceived = mutation({
  args: {
    periodId: v.id("payPeriods"),
    receivedDate: v.optional(v.string()),
  },
  handler: async (ctx, { periodId, receivedDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const period = await ctx.db.get(periodId);
    if (!period || period.userId !== userId) throw new Error("not found");
    await ctx.db.patch(periodId, {
      received: true,
      receivedDate: receivedDate ?? new Date().toISOString().slice(0, 10),
    });
  },
});

export const markPending = mutation({
  args: { periodId: v.id("payPeriods") },
  handler: async (ctx, { periodId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const period = await ctx.db.get(periodId);
    if (!period || period.userId !== userId) throw new Error("not found");
    await ctx.db.patch(periodId, { received: false, receivedDate: undefined });
  },
});

export const updateAmount = mutation({
  args: { periodId: v.id("payPeriods"), amount: v.number() },
  handler: async (ctx, { periodId, amount }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const period = await ctx.db.get(periodId);
    if (!period || period.userId !== userId) throw new Error("not found");
    await ctx.db.patch(periodId, { amount });
  },
});


