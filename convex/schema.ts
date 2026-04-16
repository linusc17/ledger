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
});
