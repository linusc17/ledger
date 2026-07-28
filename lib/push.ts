"use client";

const SW_PATH = "/sw.js";

export type SubscribeResult =
  | { ok: true; endpoint: string; p256dh: string; auth: string }
  | { ok: false; reason: "unsupported" | "denied" | "dismissed" | "failed" };

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports as a Mac, so fall back to touch support to catch it.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// iOS only exposes the Push API to a home-screen install. In a Safari tab the
// API is simply absent, so a toggle there would fail with no explanation.
export function needsHomeScreenInstall(): boolean {
  return isIos() && !isStandalone();
}

export function permissionState(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function readyRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
  const registration = existing ?? (await navigator.serviceWorker.register(SW_PATH));
  await navigator.serviceWorker.ready;
  return registration;
}

export async function currentEndpoint(): Promise<string | null> {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (!registration) return null;
  const sub = await registration.pushManager.getSubscription();
  return sub?.endpoint ?? null;
}

// Must be called from a user gesture — Safari and iOS both reject a permission
// prompt that isn't tied to a tap.
export async function subscribe(vapidPublicKey: string): Promise<SubscribeResult> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };

  try {
    const registration = await readyRegistration();
    const permission = await Notification.requestPermission();
    if (permission === "denied") return { ok: false, reason: "denied" };
    if (permission !== "granted") return { ok: false, reason: "dismissed" };

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }));

    const keys = subscription.toJSON().keys;
    if (!keys?.p256dh || !keys?.auth) return { ok: false, reason: "failed" };

    return {
      ok: true,
      endpoint: subscription.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export async function unsubscribe(): Promise<string | null> {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (!registration) return null;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}
