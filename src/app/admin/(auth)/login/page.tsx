import type { Metadata } from "next";
import { LoginForm } from "@/features/admin/LoginForm";
import { Logo } from "@/features/landing/Logo";

export const metadata: Metadata = { title: "Sign in | Sourced AI admin" };

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-8 px-4">
      <Logo />
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Admin sign in</h1>
        <p className="mt-2 text-sm text-muted">Gap report and handoffs for the Pinebrook Supply demo.</p>
      </div>
      <LoginForm />
    </main>
  );
}
