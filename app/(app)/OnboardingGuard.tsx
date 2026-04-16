"use client";

import { useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function OnboardingGuard() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const profile = useQuery(api.profile.get, isAuthenticated ? {} : "skip");
  const generatePay = useMutation(api.pay.generateMissing);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    if (profile === undefined) return;

    if (!profile || !profile.onboardingComplete) {
      if (pathname !== "/onboarding") {
        router.replace("/onboarding");
      }
      return;
    }

    void generatePay();
  }, [isAuthenticated, isLoading, profile, generatePay, router, pathname]);

  return null;
}
