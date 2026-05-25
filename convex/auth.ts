import { Password } from "@convex-dev/auth/providers/Password";
import {
  convexAuth,
  getAuthUserId,
  modifyAccountCredentials,
  retrieveAccount,
} from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

const YEAR_MS = 1000 * 60 * 60 * 24 * 365;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  session: {
    totalDurationMs: YEAR_MS,
    inactiveDurationMs: YEAR_MS,
  },
});

export const getUserEmail = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    return user?.email ?? null;
  },
});

export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { currentPassword, newPassword }) => {
    const userId = (await getAuthUserId(ctx)) as Id<"users"> | null;
    if (!userId) throw new Error("Not signed in.");
    if (newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters.");
    }

    const email = await ctx.runQuery(internal.auth.getUserEmail, { userId });
    if (!email) throw new Error("No email on account.");

    try {
      await retrieveAccount(ctx, {
        provider: "password",
        account: { id: email, secret: currentPassword },
      });
    } catch {
      throw new Error("Current password is incorrect.");
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: email, secret: newPassword },
    });
  },
});

