import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// One row per device — your Mac and your iPhone subscribe independently.
export const saveSubscription = mutation({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  handler: async (ctx, { endpoint, p256dh, auth }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { userId, p256dh, auth });
      return;
    }
    await ctx.db.insert("pushSubscriptions", { userId, endpoint, p256dh, auth });
  },
});

export const removeSubscription = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .first();
    if (existing && existing.userId === userId) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const deviceCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;
    const rows = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.length;
  },
});

export const subscriptionsForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const dropSubscription = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const row = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .first();
    if (row) await ctx.db.delete(row._id);
  },
});

// Returns null when the reminder should be skipped — the usual case being
// that you already clocked out before the shift ran its length.
export const clockOutReminder = internalQuery({
  args: { shiftId: v.id("shifts") },
  handler: async (ctx, { shiftId }) => {
    const shift = await ctx.db.get(shiftId);
    if (!shift || shift.clockOutAt !== undefined) return null;
    const client = await ctx.db.get(shift.clientId);
    if (!client) return null;
    return { userId: shift.userId, clientName: client.name };
  },
});
