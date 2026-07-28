import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const open = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("shifts")
      .withIndex("by_user_open", (q) =>
        q.eq("userId", userId).eq("clockOutAt", undefined),
      )
      .collect();
  },
});

export const forDay = query({
  args: { shiftDate: v.string() },
  handler: async (ctx, { shiftDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("shifts")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("shiftDate", shiftDate),
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
      .query("shifts")
      .withIndex("by_user_date", (q) =>
        q
          .eq("userId", userId)
          .gte("shiftDate", startDate)
          .lte("shiftDate", endDate),
      )
      .collect();
  },
});

// remindAt is computed on the device so Tally never has to store a timezone:
// the browser knows what "today at 5:00 PM" means locally, and the scheduler
// only ever sees a plain epoch timestamp.
export const clockIn = mutation({
  args: {
    clientId: v.id("clients"),
    shiftDate: v.string(),
    remindAt: v.optional(v.number()),
  },
  handler: async (ctx, { clientId, shiftDate, remindAt }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const client = await ctx.db.get(clientId);
    if (!client || client.userId !== userId) throw new Error("not found");

    const openShifts = await ctx.db
      .query("shifts")
      .withIndex("by_user_open", (q) =>
        q.eq("userId", userId).eq("clockOutAt", undefined),
      )
      .collect();
    if (openShifts.some((s) => s.clientId === clientId)) {
      throw new Error("already clocked in");
    }

    const now = Date.now();
    // A reminder in the past is meaningless — clocking in after the fixed
    // clock-out time just runs the shift with no nudge.
    const scheduledFor = remindAt && remindAt > now ? remindAt : undefined;

    const shiftId = await ctx.db.insert("shifts", {
      userId,
      clientId,
      shiftDate,
      clockInAt: now,
      remindAt: scheduledFor,
    });

    if (scheduledFor) {
      const reminderJobId = await ctx.scheduler.runAt(
        scheduledFor,
        internal.push.sendClockOutReminder,
        { shiftId },
      );
      await ctx.db.patch(shiftId, { reminderJobId });
    }

    return shiftId;
  },
});

export const clockOut = mutation({
  args: { shiftId: v.id("shifts") },
  handler: async (ctx, { shiftId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const shift = await ctx.db.get(shiftId);
    if (!shift || shift.userId !== userId) throw new Error("not found");
    if (shift.clockOutAt !== undefined) return;

    if (shift.reminderJobId) {
      await ctx.scheduler.cancel(shift.reminderJobId);
    }
    await ctx.db.patch(shiftId, {
      clockOutAt: Date.now(),
      reminderJobId: undefined,
    });
  },
});

export const remove = mutation({
  args: { shiftId: v.id("shifts") },
  handler: async (ctx, { shiftId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const shift = await ctx.db.get(shiftId);
    if (!shift || shift.userId !== userId) throw new Error("not found");
    if (shift.reminderJobId) {
      await ctx.scheduler.cancel(shift.reminderJobId);
    }
    await ctx.db.delete(shiftId);
  },
});
