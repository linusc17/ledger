import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    redirect("/");
  }
  return <LoginForm />;
}
