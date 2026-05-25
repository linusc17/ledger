import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listMonth = query({
  args: { month: v.string() },
  handler: async (ctx, { month }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("otherIncome")
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

export const create = mutation({
  args: {
    entryDate: v.string(),
    amount: v.number(),
    source: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    if (!(args.amount > 0)) throw new Error("amount must be positive");
    if (!args.source.trim()) throw new Error("source required");
    return await ctx.db.insert("otherIncome", { userId, ...args, source: args.source.trim() });
  },
});

export const update = mutation({
  args: {
    entryId: v.id("otherIncome"),
    entryDate: v.optional(v.string()),
    amount: v.optional(v.number()),
    source: v.optional(v.string()),
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
    if (patch.source !== undefined && !patch.source.trim()) {
      throw new Error("source required");
    }
    const clean: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(patch)) {
      if (val !== undefined) clean[k] = k === "source" ? (val as string).trim() : val;
    }
    await ctx.db.patch(entryId, clean);
  },
});

export const remove = mutation({
  args: { entryId: v.id("otherIncome") },
  handler: async (ctx, { entryId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const entry = await ctx.db.get(entryId);
    if (!entry || entry.userId !== userId) throw new Error("not found");
    await ctx.db.delete(entryId);
  },
});
