"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function OnboardingGuard() {
  const profile = useQuery(api.profile.get);
  const generatePay = useMutation(api.pay.generateMissing);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (profile === undefined) return;

    if (!profile || !profile.onboardingComplete) {
      if (pathname !== "/onboarding") {
        router.replace("/onboarding");
      }
      return;
    }

    void generatePay();
  }, [profile, generatePay, router, pathname]);

  return null;
}
