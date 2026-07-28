"use node";

import { v } from "convex/values";
import webpush from "web-push";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type Payload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

function configureVapid(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:notifications@tally.local",
    publicKey,
    privateKey,
  );
  return true;
}

async function deliver(
  ctx: ActionCtx,
  userId: Id<"users">,
  payload: Payload,
): Promise<number> {
  if (!configureVapid()) {
    console.error("VAPID keys missing — cannot send push");
    return 0;
  }

  const subscriptions = await ctx.runQuery(
    internal.notifications.subscriptionsForUser,
    { userId },
  );

  let sent = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // 404/410 mean the browser threw the subscription away — app deleted,
      // permission revoked, or a reinstall. Stop trying that endpoint.
      if (status === 404 || status === 410) {
        await ctx.runMutation(internal.notifications.dropSubscription, {
          endpoint: sub.endpoint,
        });
      } else {
        console.error("push failed", status, err);
      }
    }
  }
  return sent;
}

export const sendClockOutReminder = internalAction({
  args: { shiftId: v.id("shifts") },
  handler: async (ctx, { shiftId }) => {
    const details = await ctx.runQuery(
      internal.notifications.clockOutReminder,
      { shiftId },
    );
    if (!details) return;

    await deliver(ctx, details.userId, {
      title: "Time to clock out",
      body: `Your shift at ${details.clientName} is done.`,
      url: "/today",
      tag: `clock-out-${shiftId}`,
    });
  },
});

export const sendTest = action({
  args: {},
  handler: async (ctx): Promise<{ sent: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const sent = await deliver(ctx, userId, {
      title: "Notifications are on",
      body: "This is what a clock-out reminder will look like.",
      url: "/today",
      tag: "tally-test",
    });
    return { sent };
  },
});
