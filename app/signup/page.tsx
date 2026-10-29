import type { Metadata } from "next";
import Link from "next/link";
import { AuthAside } from "@/components/auth-aside";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Create your card",
  description: "Claim your Tappd handle and start sharing a card that stays up to date.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = params.next && params.next.startsWith("/") ? params.next : "/app/card";
  if (await getCurrentUser()) redirect(redirectTo);

  return (
    <main className="min-h-dvh bg-paper lg:grid lg:grid-cols-[1fr_1.05fr]">
      <AuthAside />
      <section className="flex min-h-dvh flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10">
          <span className="eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-ink" />
            Free to start
          </span>
          <h1 className="mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.03em]">
            Create your card
          </h1>
          <p className="mt-2 text-[0.92rem] leading-relaxed text-muted">
            Two minutes now, and every introduction after this one gets easier.
          </p>
          <AuthForm mode="signup" redirectTo={redirectTo} />
          <p className="mt-8 text-center text-[0.72rem] leading-relaxed text-faint">
            Before your account is created, you’ll review and accept the <Link href="/terms" className="font-medium underline underline-offset-2">Terms of Use</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
