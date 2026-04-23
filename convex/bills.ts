import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

function toIso(y: number, m: number, d: number): string {
  const last = new Date(y, m + 1, 0).getDate();
  const clamped = Math.min(d, last);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(clamped).padStart(2, "0")}`;
}

export const listTemplates = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("billTemplates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const listPeriods = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("billPeriods")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));
  },
});

export const createTemplate = mutation({
  args: {
    name: v.string(),
    amount: v.number(),
    dueDay: v.number(),
    variableAmount: v.boolean(),
  },
  handler: async (ctx, { name, amount, dueDay, variableAmount }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");

    const existing = await ctx.db
      .query("billTemplates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const sortOrder = existing.reduce((max, t) => Math.max(max, t.sortOrder), 0) + 1;

    const templateId = await ctx.db.insert("billTemplates", {
      userId,
      name,
      amount,
      dueDay,
      variableAmount,
      sortOrder,
    });

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    for (let offset = 0; offset <= 1; offset++) {
      let yy = y;
      let mm = m + offset;
      if (mm > 11) { yy++; mm = 0; }
      const dueDate = toIso(yy, mm, dueDay);
      await ctx.db.insert("billPeriods", {
        userId,
        templateId,
        dueDate,
        amount,
        paid: false,
      });
    }

    return templateId;
  },
});

export const updateTemplate = mutation({
  args: {
    templateId: v.id("billTemplates"),
    name: v.optional(v.string()),
    amount: v.optional(v.number()),
    dueDay: v.optional(v.number()),
    variableAmount: v.optional(v.boolean()),
  },
  handler: async (ctx, { templateId, ...patch }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const template = await ctx.db.get(templateId);
    if (!template || template.userId !== userId) throw new Error("not found");
    const clean: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(patch)) {
      if (val !== undefined) clean[k] = val;
    }
    await ctx.db.patch(templateId, clean);
  },
});

export const deleteTemplate = mutation({
  args: { templateId: v.id("billTemplates") },
  handler: async (ctx, { templateId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const template = await ctx.db.get(templateId);
    if (!template || template.userId !== userId) throw new Error("not found");
    const periods = await ctx.db
      .query("billPeriods")
      .withIndex("by_template_date", (q) => q.eq("templateId", templateId))
      .collect();
    for (const p of periods) {
      await ctx.db.delete(p._id);
    }
    await ctx.db.delete(templateId);
  },
});

export const generateMissingPeriods = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const templates = await ctx.db
      .query("billTemplates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    let created = 0;

    for (const template of templates) {
      const existing = await ctx.db
        .query("billPeriods")
        .withIndex("by_template_date", (q) => q.eq("templateId", template._id))
        .collect();
      const seen = new Set(existing.map((p) => p.dueDate));

      for (let offset = 0; offset <= 1; offset++) {
        let y = currentYear;
        let m = currentMonth + offset;
        if (m > 11) { y++; m = 0; }
        const dueDate = toIso(y, m, template.dueDay);
        if (seen.has(dueDate)) continue;
        await ctx.db.insert("billPeriods", {
          userId,
          templateId: template._id,
          dueDate,
          amount: template.amount,
          paid: false,
        });
        created++;
      }
    }
    return { created };
  },
});

export const markPaid = mutation({
  args: {
    periodId: v.id("billPeriods"),
    paidDate: v.optional(v.string()),
  },
  handler: async (ctx, { periodId, paidDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const period = await ctx.db.get(periodId);
    if (!period || period.userId !== userId) throw new Error("not found");
    await ctx.db.patch(periodId, {
      paid: true,
      paidDate: paidDate ?? new Date().toISOString().slice(0, 10),
    });
  },
});

export const markUnpaid = mutation({
  args: { periodId: v.id("billPeriods") },
  handler: async (ctx, { periodId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const period = await ctx.db.get(periodId);
    if (!period || period.userId !== userId) throw new Error("not found");
    await ctx.db.patch(periodId, { paid: false, paidDate: undefined });
  },
});

export const updatePeriodAmount = mutation({
  args: { periodId: v.id("billPeriods"), amount: v.number() },
  handler: async (ctx, { periodId, amount }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const period = await ctx.db.get(periodId);
    if (!period || period.userId !== userId) throw new Error("not found");
    await ctx.db.patch(periodId, { amount });
  },
});
