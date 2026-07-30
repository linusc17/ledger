import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Prefetching the tab routes is pointless without this. Every route is
    // dynamic (the root layout's auth provider reads cookies), and the client
    // router's default staleTime for dynamic segments is 0 — so a prefetched
    // payload is discarded and refetched the moment you navigate to it, which
    // put a server round trip in front of every tab transition.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
};

export default nextConfig;
