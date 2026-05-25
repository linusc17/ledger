import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const categoryValidator = v.union(
  v.literal("needed"),
  v.literal("unnecessary"),
  v.literal("other"),
);

export const listMonth = query({
  args: { month: v.string() },
  handler: async (ctx, { month }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("spendEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();
    return rows
      .filter((r) => r.entryDate.startsWith(month))
      .sort((a, b) => {
        if (a.entryDate !== b.entryDate) return a.entryDate < b.entryDate ? 1 : -1;
        return b._creationTime - a._creationTime;
      });
  },
});

export const monthSummary = query({
  args: { month: v.string() },
  handler: async (ctx, { month }) => {
    const userId = await getAuthUserId(ctx);
    const empty = {
      income: 0,
      billsPaid: 0,
      spending: 0,
      byCategory: { needed: 0, unnecessary: 0, other: 0 },
      saved: 0,
    };
    if (!userId) return empty;

    const pay = await ctx.db
      .query("payPeriods")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const income = pay.reduce((acc, p) => {
      if (p.received && p.receivedDate && p.receivedDate.startsWith(month) && p.amount) {
        return acc + p.amount;
      }
      return acc;
    }, 0);

    const bills = await ctx.db
      .query("billPeriods")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const billsPaid = bills.reduce((acc, b) => {
      if (b.paid && b.paidDate && b.paidDate.startsWith(month) && b.amount) {
        return acc + b.amount;
      }
      return acc;
    }, 0);

    const spends = await ctx.db
      .query("spendEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();
    const byCategory = { needed: 0, unnecessary: 0, other: 0 };
    let spending = 0;
    for (const s of spends) {
      if (!s.entryDate.startsWith(month)) continue;
      byCategory[s.category] += s.amount;
      spending += s.amount;
    }

    return {
      income,
      billsPaid,
      spending,
      byCategory,
      saved: income - billsPaid - spending,
    };
  },
});

export const create = mutation({
  args: {
    entryDate: v.string(),
    category: categoryValidator,
    amount: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    if (!(args.amount > 0)) throw new Error("amount must be positive");
    return await ctx.db.insert("spendEntries", { userId, ...args });
  },
});

export const update = mutation({
  args: {
    entryId: v.id("spendEntries"),
    entryDate: v.optional(v.string()),
    category: v.optional(categoryValidator),
    amount: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { entryId, ...patch }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const entry = await ctx.db.get(entryId);
    if (!entry || entry.userId !== userId) throw new Error("not found");
    if (patch.amount !== undefined && !(patch.amount > 0)) {
      throw new Error("amount must be positive");
    }
    const clean: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(patch)) {
      if (val !== undefined) clean[k] = val;
    }
    await ctx.db.patch(entryId, clean);
  },
});

export const remove = mutation({
  args: { entryId: v.id("spendEntries") },
  handler: async (ctx, { entryId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const entry = await ctx.db.get(entryId);
    if (!entry || entry.userId !== userId) throw new Error("not found");
    await ctx.db.delete(entryId);
  },
});
