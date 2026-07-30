import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "./ConvexClientProvider";
import "./globals.css";

const dm = DM_Sans({
  variable: "--font-dm",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

// Every iPhone since the X, in CSS pixels plus its pixel ratio. iOS only uses
// a launch image whose media query matches the device exactly, so a screen
// missing from this list falls back to painting nothing.
const IPHONE_SCREENS = [
  { w: 375, h: 667, r: 2 }, // SE 2nd/3rd gen
  { w: 414, h: 736, r: 3 }, // 8 Plus
  { w: 375, h: 812, r: 3 }, // X, XS, 11 Pro
  { w: 414, h: 896, r: 2 }, // XR, 11
  { w: 414, h: 896, r: 3 }, // XS Max, 11 Pro Max
  { w: 360, h: 780, r: 3 }, // 12 mini, 13 mini
  { w: 390, h: 844, r: 3 }, // 12, 13, 14
  { w: 428, h: 926, r: 3 }, // 12/13 Pro Max, 14 Plus
  { w: 393, h: 852, r: 3 }, // 14 Pro, 15, 15 Pro, 16
  { w: 430, h: 932, r: 3 }, // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  { w: 402, h: 874, r: 3 }, // 16 Pro
  { w: 440, h: 956, r: 3 }, // 16 Pro Max
];

// Dark entries come first so they win on a dark device; the plain entry then
// catches everything else. Without that fallback, a device where the colour
// scheme query fails to match would get no launch image at all — which is the
// black screen this exists to remove.
const startupImage = IPHONE_SCREENS.flatMap(({ w, h, r }) => {
  const dimensions = `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r})`;
  return [
    {
      url: `/startup-image?w=${w * r}&h=${h * r}&dark=1`,
      media: `${dimensions} and (prefers-color-scheme: dark)`,
    },
    {
      url: `/startup-image?w=${w * r}&h=${h * r}`,
      media: dimensions,
    },
  ];
});

export const metadata: Metadata = {
  title: "Tally",
  description: "Daily work, income, bills, and spending — tracked together.",
  manifest: "/manifest.webmanifest",
  applicationName: "Tally",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tally",
    startupImage,
  },
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = !!process.env.NEXT_PUBLIC_CONVEX_URL;
  const fontClasses = `${dm.variable} ${mono.variable} h-full antialiased`;

  const body = (
    <html lang="en" className={fontClasses}>
      <body className="min-h-full">
        {configured ? (
          <ConvexClientProvider>{children}</ConvexClientProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );

  if (configured) {
    return <ConvexAuthNextjsServerProvider>{body}</ConvexAuthNextjsServerProvider>;
  }
  return body;
}
