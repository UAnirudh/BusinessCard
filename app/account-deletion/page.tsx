import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldAlert } from "lucide-react";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Delete your account",
  description: "Start deleting your Tappd account and associated data.",
};

export const dynamic = "force-dynamic";

export default async function AccountDeletionPage() {
  const user = await getCurrentUser();
  const destination = user ? "/app/settings#delete-account" : "/login?next=%2Fapp%2Fsettings%23delete-account";

  return (
    <main className="min-h-dvh bg-paper px-4 py-6 text-ink sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="flex items-center justify-between">
          <Logo />
          <Link href="/" className="btn btn-outline btn-sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </Link>
        </header>

        <section className="surface mt-8 p-5 sm:mt-12 sm:p-9">
          <div className="flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted">
            <ShieldAlert className="h-4 w-4" /> Account and data control
          </div>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.035em] sm:text-[2.5rem]">Delete your Tappd account</h1>
          <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-muted">
            You can start account deletion on this website without reinstalling the app. Sign in to confirm with your password, then choose <strong>Delete account</strong> in Settings.
          </p>

          <div className="mt-6 rounded-2xl border border-[#f0dcd1] bg-[#fff8f4] p-4 text-[0.84rem] leading-relaxed text-muted">
            Deletion permanently removes your Tappd account, card, avatar, sessions, and wallet records from the active database. Other people may retain contact details they previously saved. Provider backups may retain copies until their normal rotation period ends. Export your wallet before continuing if you need a copy.
          </div>

          <Link href={destination} className="btn btn-primary mt-6 w-full sm:w-auto">
            {user ? "Open delete controls" : "Sign in to delete your account"}
            <ArrowRight className="h-4 w-4" />
          </Link>

          <p className="mt-5 text-[0.78rem] leading-relaxed text-faint">
            This self-service process uses your Tappd password to verify the request. {SUPPORT_EMAIL ? <>If you cannot access your account, contact{" "}
            <a className="font-medium underline underline-offset-2" href={`mailto:${SUPPORT_EMAIL}?subject=Tappd%20account%20deletion%20help`}>{SUPPORT_EMAIL}</a>. </> : "A monitored support address must be configured by the operator before production release."}
            Never send your password by email.
          </p>
        </section>
      </div>
    </main>
  );
}
