import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthAside } from "@/components/auth-aside";
import { Logo } from "@/components/logo";
import { PasswordResetForm } from "@/components/password-reset-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your Tappd account.",
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const validTokenShape = /^[A-Za-z0-9_-]{20,200}$/.test(token);

  return (
    <main className="min-h-dvh bg-paper lg:grid lg:grid-cols-[1fr_1.05fr]">
      <AuthAside />
      <section className="flex min-h-dvh flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden"><Logo /></div>
        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10">
          <Link href="/login" className="mb-7 inline-flex items-center gap-2 text-[0.8rem] font-medium text-muted hover:text-ink"><ArrowLeft className="h-3.5 w-3.5" /> Back to log in</Link>
          <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-ink" /> Account access</span>
          <h1 className="mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.03em]">Choose a new password</h1>
          {validTokenShape ? (
            <>
              <p className="mt-2 text-[0.92rem] leading-relaxed text-muted">Use at least 8 characters. You’ll be signed out of Tappd on your other devices.</p>
              <PasswordResetForm token={token} />
            </>
          ) : (
            <div className="mt-5 rounded-xl border border-[#f0d5c7] bg-[#fff7f2] px-3 py-3 text-[0.84rem] leading-relaxed text-muted" role="alert">
              This reset link is missing or invalid. <Link className="font-semibold text-ink underline underline-offset-2" href="/forgot-password">Request a new one</Link>.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
