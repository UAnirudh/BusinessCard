import type { Metadata } from "next";
import { AuthAside } from "@/components/auth-aside";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Tappd card and wallet.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = params.next && params.next.startsWith("/") ? params.next : "/app";
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
            Welcome back
          </span>
          <h1 className="mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.03em]">
            Log in to Tappd
          </h1>
          <p className="mt-2 text-[0.92rem] leading-relaxed text-muted">
            Your card, your wallet and everyone you met are right where you left them.
          </p>
          <AuthForm mode="login" redirectTo={redirectTo} />
        </div>
      </section>
    </main>
  );
}
