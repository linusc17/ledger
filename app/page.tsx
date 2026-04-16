import { redirect } from "next/navigation";
import SetupScreen from "./SetupScreen";

export default function Home() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <SetupScreen />;
  }
  redirect("/today");
}
