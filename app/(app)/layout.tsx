import { redirect } from "next/navigation";
import BottomNav from "@/components/bottom-nav";
import OnboardingGuard from "./OnboardingGuard";
import WarmQueries from "./WarmQueries";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    redirect("/");
  }
  return (
    <>
      <OnboardingGuard />
      <WarmQueries />
      <div className="flex h-svh flex-col">
        <div className="page-scroll flex-1 overflow-y-auto">{children}</div>
        <BottomNav />
      </div>
    </>
  );
}
