import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});


export const updateName = mutation({
  args: { clientId: v.id("clients"), name: v.string() },
  handler: async (ctx, { clientId, name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const client = await ctx.db.get(clientId);
    if (!client || client.userId !== userId) throw new Error("not found");
    await ctx.db.patch(clientId, { name });
  },
});

export const updateTasks = mutation({
  args: {
    clientId: v.id("clients"),
    dailyTasks: v.array(v.object({ id: v.string(), label: v.string() })),
  },
  handler: async (ctx, { clientId, dailyTasks }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const client = await ctx.db.get(clientId);
    if (!client || client.userId !== userId) throw new Error("not found");
    await ctx.db.patch(clientId, { dailyTasks });
  },
});

export const updatePay = mutation({
  args: {
    clientId: v.id("clients"),
    payDays: v.array(v.number()),
    defaultAmount: v.optional(v.number()),
  },
  handler: async (ctx, { clientId, payDays, defaultAmount }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const client = await ctx.db.get(clientId);
    if (!client || client.userId !== userId) throw new Error("not found");
    await ctx.db.patch(clientId, { payDays, defaultAmount });
  },
});

export const reorder = mutation({
  args: { clientIds: v.array(v.id("clients")) },
  handler: async (ctx, { clientIds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    for (let i = 0; i < clientIds.length; i++) {
      const c = await ctx.db.get(clientIds[i]);
      if (!c || c.userId !== userId) continue;
      await ctx.db.patch(clientIds[i], { sortOrder: i });
    }
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    dailyTasks: v.array(v.object({ id: v.string(), label: v.string() })),
    payDays: v.optional(v.array(v.number())),
    defaultAmount: v.optional(v.number()),
  },
  handler: async (ctx, { name, dailyTasks, payDays, defaultAmount }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const all = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return await ctx.db.insert("clients", {
      userId,
      name,
      dailyTasks,
      payDays: payDays ?? [15],
      defaultAmount,
      sortOrder: all.length,
    });
  },
});

export const remove = mutation({
  args: { clientId: v.id("clients") },
  handler: async (ctx, { clientId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const client = await ctx.db.get(clientId);
    if (!client || client.userId !== userId) throw new Error("not found");
    const logs = await ctx.db
      .query("dailyLogs")
      .withIndex("by_client_date", (q) => q.eq("clientId", clientId))
      .collect();
    for (const log of logs) await ctx.db.delete(log._id);
    const periods = await ctx.db
      .query("payPeriods")
      .withIndex("by_client_date", (q) => q.eq("clientId", clientId))
      .collect();
    for (const p of periods) await ctx.db.delete(p._id);
    await ctx.db.delete(clientId);
  },
});
