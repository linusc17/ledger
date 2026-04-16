import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const forDay = query({
  args: { logDate: v.string() },
  handler: async (ctx, { logDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("dailyLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("logDate", logDate),
      )
      .collect();
  },
});

export const forRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { startDate, endDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("dailyLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("logDate", startDate).lte("logDate", endDate),
      )
      .collect();
  },
});

export const forClientRange = query({
  args: {
    clientId: v.id("clients"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { clientId, startDate, endDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("dailyLogs")
      .withIndex("by_user_client_date", (q) =>
        q
          .eq("userId", userId)
          .eq("clientId", clientId)
          .gte("logDate", startDate)
          .lte("logDate", endDate),
      )
      .collect();
  },
});

export const toggleTask = mutation({
  args: {
    clientId: v.id("clients"),
    logDate: v.string(),
    taskId: v.string(),
  },
  handler: async (ctx, { clientId, logDate, taskId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const client = await ctx.db.get(clientId);
    if (!client || client.userId !== userId) throw new Error("not found");

    const existing = await ctx.db
      .query("dailyLogs")
      .withIndex("by_user_client_date", (q) =>
        q.eq("userId", userId).eq("clientId", clientId).eq("logDate", logDate),
      )
      .first();

    if (!existing) {
      await ctx.db.insert("dailyLogs", {
        userId,
        clientId,
        logDate,
        completedTaskIds: [taskId],
      });
      return;
    }
    const has = existing.completedTaskIds.includes(taskId);
    const next = has
      ? existing.completedTaskIds.filter((t) => t !== taskId)
      : [...existing.completedTaskIds, taskId];
    await ctx.db.patch(existing._id, { completedTaskIds: next });
  },
});

export const setNotes = mutation({
  args: {
    clientId: v.id("clients"),
    logDate: v.string(),
    notes: v.string(),
  },
  handler: async (ctx, { clientId, logDate, notes }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const client = await ctx.db.get(clientId);
    if (!client || client.userId !== userId) throw new Error("not found");

    const existing = await ctx.db
      .query("dailyLogs")
      .withIndex("by_user_client_date", (q) =>
        q.eq("userId", userId).eq("clientId", clientId).eq("logDate", logDate),
      )
      .first();
    if (!existing) {
      await ctx.db.insert("dailyLogs", {
        userId,
        clientId,
        logDate,
        completedTaskIds: [],
        notes,
      });
      return;
    }
    await ctx.db.patch(existing._id, { notes });
  },
});
