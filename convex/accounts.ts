import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { computeGap } from "./reconcileMath";

const COLOR_PALETTE = [
  "#3e6b9a", "#3e9a8e", "#8a5fa5", "#d4a02d",
  "#c7542a", "#b54a6e", "#a0631f", "#8a7f75",
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

async function activeAccounts(ctx: QueryCtx, userId: Id<"users">) {
  const all = await ctx.db
    .query("accounts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return all
    .filter((a) => !a.archivedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

async function latestCheck(ctx: QueryCtx, userId: Id<"users">) {
  const checks = await ctx.db
    .query("balanceChecks")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return checks.sort((a, b) =>
    a.checkDate !== b.checkDate
      ? (a.checkDate < b.checkDate ? 1 : -1)
      : b._creationTime - a._creationTime,
  )[0];
}

// Sum the flows the app DID track between two dates (exclusive start, inclusive end).
// Spending excludes the reserved "Untracked" category — those rows ARE prior gaps.
async function sumTrackedFlows(
  ctx: QueryCtx,
  userId: Id<"users">,
  since: string,
  until: string,
) {
  const pay = await ctx.db
    .query("payPeriods")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  let income = 0;
  for (const p of pay) {
    if (p.received && p.receivedDate && p.receivedDate > since && p.receivedDate <= until && p.amount) {
      income += p.amount;
    }
  }
  const other = await ctx.db
    .query("otherIncome")
    .withIndex("by_user_date", (q) => q.eq("userId", userId))
    .collect();
  for (const e of other) {
    if (e.entryDate > since && e.entryDate <= until) income += e.amount;
  }

  const billRows = await ctx.db
    .query("billPeriods")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  let bills = 0;
  for (const b of billRows) {
    if (b.paid && b.paidDate && b.paidDate > since && b.paidDate <= until && b.amount) {
      bills += b.amount;
    }
  }

  const cats = await ctx.db
    .query("spendCategories")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const reserved = new Set(cats.filter((c) => c.reserved).map((c) => c._id as string));
  const spends = await ctx.db
    .query("spendEntries")
    .withIndex("by_user_date", (q) => q.eq("userId", userId))
    .collect();
  let spend = 0;
  for (const s of spends) {
    if (s.entryDate > since && s.entryDate <= until && !reserved.has(s.categoryId as string)) {
      spend += s.amount;
    }
  }

  return { income, bills, spend };
}

async function ensureUntrackedCategory(ctx: MutationCtx, userId: Id<"users">): Promise<Id<"spendCategories">> {
  const cats = await ctx.db
    .query("spendCategories")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const existing = cats.find((c) => c.reserved && !c.deletedAt);
  if (existing) return existing._id;
  const sortOrder = cats.reduce((m, c) => Math.max(m, c.sortOrder), 0) + 1;
  return await ctx.db.insert("spendCategories", {
    userId,
    name: "Untracked",
    color: "#8a7f75",
    sortOrder,
    reserved: true,
  });
}

export const listAccounts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await activeAccounts(ctx, userId);
  },
});

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const accounts = await activeAccounts(ctx, userId);
    const netWorth = accounts.reduce((s, a) => s + a.currentBalance, 0);
    const last = await latestCheck(ctx, userId);
    let expectedDelta = 0;
    if (last) {
      const f = await sumTrackedFlows(ctx, userId, last.checkDate, todayIso());
      expectedDelta = f.income - f.bills - f.spend;
    }
    return {
      accounts,
      netWorth,
      lastCheckDate: last?.checkDate ?? null,
      expectedDelta,
    };
  },
});

export const createAccount = mutation({
  args: { name: v.string(), currentBalance: v.number() },
  handler: async (ctx, { name, currentBalance }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const trimmed = name.trim();
    if (!trimmed) throw new Error("name required");
    const active = await activeAccounts(ctx, userId);
    const sortOrder = active.reduce((m, a) => Math.max(m, a.sortOrder), 0) + 1;
    const color = nextColor(active.map((a) => a.color));
    const today = todayIso();
    const id = await ctx.db.insert("accounts", {
      userId,
      name: trimmed,
      color,
      sortOrder,
      currentBalance,
      balanceUpdatedAt: today,
    });

    const last = await latestCheck(ctx, userId);
    if (!last) {
      // First account ever -> establish the baseline net worth.
      const netWorth = active.reduce((s, a) => s + a.currentBalance, 0) + currentBalance;
      await ctx.db.insert("balanceChecks", { userId, checkDate: today, netWorth });
    } else {
      // Existing baseline: this is pre-existing money newly tracked, not income.
      // Fold it into the last checkpoint so the next true-up doesn't read it as a gap.
      await ctx.db.patch(last._id, { netWorth: last.netWorth + currentBalance });
    }
    return id;
  },
});

export const updateAccount = mutation({
  args: { accountId: v.id("accounts"), name: v.optional(v.string()), color: v.optional(v.string()) },
  handler: async (ctx, { accountId, name, color }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const acct = await ctx.db.get(accountId);
    if (!acct || acct.userId !== userId) throw new Error("not found");
    const patch: Record<string, unknown> = {};
    if (name !== undefined) {
      const t = name.trim();
      if (!t) throw new Error("name required");
      patch.name = t;
    }
    if (color !== undefined) patch.color = color;
    if (Object.keys(patch).length) await ctx.db.patch(accountId, patch);
  },
});

export const archiveAccount = mutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const acct = await ctx.db.get(accountId);
    if (!acct || acct.userId !== userId) throw new Error("not found");
    if (acct.archivedAt) return;
    await ctx.db.patch(accountId, { archivedAt: todayIso() });
    // Remove its balance from the baseline so the drop isn't read as spending.
    const last = await latestCheck(ctx, userId);
    if (last) await ctx.db.patch(last._id, { netWorth: last.netWorth - acct.currentBalance });
  },
});

export const reorder = mutation({
  args: { accountIds: v.array(v.id("accounts")) },
  handler: async (ctx, { accountIds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    for (let i = 0; i < accountIds.length; i++) {
      const a = await ctx.db.get(accountIds[i]);
      if (!a || a.userId !== userId) continue;
      await ctx.db.patch(accountIds[i], { sortOrder: i });
    }
  },
});

export const reconcile = mutation({
  args: {
    balances: v.array(v.object({ accountId: v.id("accounts"), balance: v.number() })),
  },
  handler: async (ctx, { balances }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const today = todayIso();

    for (const b of balances) {
      const acct = await ctx.db.get(b.accountId);
      if (!acct || acct.userId !== userId) throw new Error("invalid account");
      await ctx.db.patch(b.accountId, { currentBalance: b.balance, balanceUpdatedAt: today });
    }

    const accounts = await activeAccounts(ctx, userId);
    const netWorth = accounts.reduce((s, a) => s + a.currentBalance, 0);

    const prev = await latestCheck(ctx, userId);
    if (!prev) {
      await ctx.db.insert("balanceChecks", { userId, checkDate: today, netWorth });
      return { netWorth, gap: 0 };
    }

    const f = await sumTrackedFlows(ctx, userId, prev.checkDate, today);
    const gap = computeGap({
      prevNetWorth: prev.netWorth,
      trackedIncome: f.income,
      trackedBills: f.bills,
      trackedSpend: f.spend,
      actualNetWorth: netWorth,
    });

    if (gap !== 0) {
      const categoryId = await ensureUntrackedCategory(ctx, userId);
      await ctx.db.insert("spendEntries", { userId, entryDate: today, categoryId, amount: gap });
    }

    await ctx.db.insert("balanceChecks", { userId, checkDate: today, netWorth });
    return { netWorth, gap };
  },
});
