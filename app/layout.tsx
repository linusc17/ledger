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

export const metadata: Metadata = {
  title: "Ledger",
  description: "Track your daily work and pay across clients.",
  manifest: "/manifest.webmanifest",
  applicationName: "Ledger",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ledger",
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
