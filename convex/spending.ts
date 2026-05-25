import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

const COLOR_PALETTE = [
  "#d4a02d",
  "#c7542a",
  "#3e6b9a",
  "#8a5fa5",
  "#b54a6e",
  "#3e9a8e",
  "#a0631f",
  "#8a7f75",
];

const DEFAULT_CATEGORIES: { name: string; color: string }[] = [
  { name: "Food", color: COLOR_PALETTE[0] },
  { name: "Transportation", color: COLOR_PALETTE[2] },
  { name: "Other", color: COLOR_PALETTE[7] },
];

function nextColor(usedColors: string[]): string {
  for (const c of COLOR_PALETTE) {
    if (!usedColors.includes(c)) return c;
  }
  return COLOR_PALETTE[usedColors.length % COLOR_PALETTE.length];
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("spendCategories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows
      .filter((c) => !c.deletedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const existing = await ctx.db
      .query("spendCategories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (existing.length > 0) return { created: 0 };

    let order = 1;
    for (const def of DEFAULT_CATEGORIES) {
      await ctx.db.insert("spendCategories", {
        userId,
        name: def.name,
        color: def.color,
        sortOrder: order++,
      });
    }
    return { created: DEFAULT_CATEGORIES.length };
  },
});

export const createCategory = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const trimmed = name.trim();
    if (!trimmed) throw new Error("name required");
    const existing = await ctx.db
      .query("spendCategories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const active = existing.filter((c) => !c.deletedAt);
    const sortOrder = active.reduce((max, c) => Math.max(max, c.sortOrder), 0) + 1;
    const color = nextColor(active.map((c) => c.color));
    return await ctx.db.insert("spendCategories", {
      userId,
      name: trimmed,
      color,
      sortOrder,
    });
  },
});

export const updateCategory = mutation({
  args: { categoryId: v.id("spendCategories"), name: v.string() },
  handler: async (ctx, { categoryId, name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const cat = await ctx.db.get(categoryId);
    if (!cat || cat.userId !== userId) throw new Error("not found");
    if (cat.deletedAt) throw new Error("category is deleted");
    const trimmed = name.trim();
    if (!trimmed) throw new Error("name required");
    await ctx.db.patch(categoryId, { name: trimmed });
  },
});

export const deleteCategory = mutation({
  args: { categoryId: v.id("spendCategories") },
  handler: async (ctx, { categoryId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const cat = await ctx.db.get(categoryId);
    if (!cat || cat.userId !== userId) throw new Error("not found");
    if (cat.deletedAt) return;
    await ctx.db.patch(categoryId, { deletedAt: todayIso() });
  },
});

export const listMonth = query({
  args: { month: v.string() },
  handler: async (ctx, { month }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("spendEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();
    const filtered = rows
      .filter((r) => r.entryDate.startsWith(month))
      .sort((a, b) => {
        if (a.entryDate !== b.entryDate) return a.entryDate < b.entryDate ? 1 : -1;
        return b._creationTime - a._creationTime;
      });

    const catIds = Array.from(new Set(filtered.map((r) => r.categoryId)));
    const cats = await Promise.all(catIds.map((id) => ctx.db.get(id)));
    const catMap = new Map<string, { name: string; color: string; deleted: boolean }>();
    for (const c of cats) {
      if (c) {
        catMap.set(c._id, { name: c.name, color: c.color, deleted: !!c.deletedAt });
      }
    }
    return filtered.map((r) => ({
      ...r,
      categoryName: catMap.get(r.categoryId)?.name ?? "(unknown)",
      categoryColor: catMap.get(r.categoryId)?.color ?? "#8a7f75",
      categoryDeleted: catMap.get(r.categoryId)?.deleted ?? true,
    }));
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
      byCategory: [] as {
        categoryId: Id<"spendCategories">;
        name: string;
        color: string;
        amount: number;
        deleted: boolean;
      }[],
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

    const categories = await ctx.db
      .query("spendCategories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const catById = new Map(categories.map((c) => [c._id as string, c]));

    const spends = await ctx.db
      .query("spendEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();
    const sumByCat = new Map<string, number>();
    let spending = 0;
    for (const s of spends) {
      if (!s.entryDate.startsWith(month)) continue;
      sumByCat.set(s.categoryId, (sumByCat.get(s.categoryId) ?? 0) + s.amount);
      spending += s.amount;
    }

    const activeOrdered = categories
      .filter((c) => !c.deletedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const seen = new Set<string>();
    const byCategory: typeof empty.byCategory = [];

    for (const c of activeOrdered) {
      byCategory.push({
        categoryId: c._id,
        name: c.name,
        color: c.color,
        amount: sumByCat.get(c._id) ?? 0,
        deleted: false,
      });
      seen.add(c._id);
    }

    for (const [catId, amount] of sumByCat.entries()) {
      if (seen.has(catId)) continue;
      const cat = catById.get(catId);
      byCategory.push({
        categoryId: catId as Id<"spendCategories">,
        name: cat?.name ?? "(deleted)",
        color: cat?.color ?? "#8a7f75",
        amount,
        deleted: true,
      });
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
    categoryId: v.id("spendCategories"),
    amount: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    if (!(args.amount > 0)) throw new Error("amount must be positive");
    const cat = await ctx.db.get(args.categoryId);
    if (!cat || cat.userId !== userId) throw new Error("invalid category");
    if (cat.deletedAt) throw new Error("category is deleted");
    return await ctx.db.insert("spendEntries", { userId, ...args });
  },
});

export const update = mutation({
  args: {
    entryId: v.id("spendEntries"),
    entryDate: v.optional(v.string()),
    categoryId: v.optional(v.id("spendCategories")),
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
    if (patch.categoryId !== undefined) {
      const cat = await ctx.db.get(patch.categoryId);
      if (!cat || cat.userId !== userId) throw new Error("invalid category");
      if (cat.deletedAt) throw new Error("category is deleted");
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
