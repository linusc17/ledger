import { redirect } from "next/navigation";
import BottomNav from "@/components/bottom-nav";
import OnboardingGuard from "./OnboardingGuard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    redirect("/");
  }
  return (
    <>
      <OnboardingGuard />
      <div className="pb-28 sm:pb-32 min-h-svh">{children}</div>
      <BottomNav />
    </>
  );
}
