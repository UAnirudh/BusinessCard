import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthAside } from "@/components/auth-aside";
import { Logo } from "@/components/logo";
import { PasswordResetRequestForm } from "@/components/password-reset-request-form";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a secure password reset link for your Tappd account.",
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-dvh bg-paper lg:grid lg:grid-cols-[1fr_1.05fr]">
      <AuthAside />
      <section className="flex min-h-dvh flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden"><Logo /></div>
        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10">
          <Link href="/login" className="mb-7 inline-flex items-center gap-2 text-[0.8rem] font-medium text-muted hover:text-ink"><ArrowLeft className="h-3.5 w-3.5" /> Back to log in</Link>
          <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-ink" /> Account access</span>
          <h1 className="mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.03em]">Forgot your password?</h1>
          <p className="mt-2 text-[0.92rem] leading-relaxed text-muted">Enter the email on your Tappd account. If it matches, we’ll send a single-use reset link that expires in one hour.</p>
          <PasswordResetRequestForm />
        </div>
      </section>
    </main>
  );
}
