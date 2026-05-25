import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  userProfiles: defineTable({
    userId: v.id("users"),
    onboardingComplete: v.boolean(),
  }).index("by_user", ["userId"]),

  clients: defineTable({
    userId: v.id("users"),
    name: v.string(),
    dailyTasks: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
      }),
    ),
    payDays: v.array(v.number()),
    defaultAmount: v.optional(v.number()),
    sortOrder: v.number(),
  }).index("by_user", ["userId"]),

  dailyLogs: defineTable({
    userId: v.id("users"),
    clientId: v.id("clients"),
    logDate: v.string(),
    completedTaskIds: v.array(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_user_date", ["userId", "logDate"])
    .index("by_client_date", ["clientId", "logDate"])
    .index("by_user_client_date", ["userId", "clientId", "logDate"]),

  payPeriods: defineTable({
    userId: v.id("users"),
    clientId: v.id("clients"),
    payDate: v.string(),
    amount: v.optional(v.number()),
    received: v.boolean(),
    receivedDate: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_client_date", ["clientId", "payDate"]),

  billTemplates: defineTable({
    userId: v.id("users"),
    name: v.string(),
    amount: v.number(),
    dueDay: v.number(),
    variableAmount: v.boolean(),
    sortOrder: v.number(),
  }).index("by_user", ["userId"]),

  billPeriods: defineTable({
    userId: v.id("users"),
    templateId: v.id("billTemplates"),
    dueDate: v.string(),
    amount: v.optional(v.number()),
    paid: v.boolean(),
    paidDate: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_template_date", ["templateId", "dueDate"]),

  spendCategories: defineTable({
    userId: v.id("users"),
    name: v.string(),
    color: v.string(),
    sortOrder: v.number(),
    deletedAt: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  spendEntries: defineTable({
    userId: v.id("users"),
    entryDate: v.string(),
    categoryId: v.id("spendCategories"),
    amount: v.number(),
    note: v.optional(v.string()),
  }).index("by_user_date", ["userId", "entryDate"]),
});
