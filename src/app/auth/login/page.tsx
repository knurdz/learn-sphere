import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Sign in | LearnSphere",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#e0e7ff,_transparent_35%),#f8fafc] px-6 py-12">
      <AuthForm mode="login" />
    </main>
  );
}
