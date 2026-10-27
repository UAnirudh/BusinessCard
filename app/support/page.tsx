import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, HelpCircle, Mail } from "lucide-react";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Support",
  description: "Help with Tappd digital business cards, contact sharing, and your account.",
};

const topics = [
  {
    title: "Sharing a card with someone who does not use Tappd",
    body: "Send your public card link or let them scan your QR code. They can open the card in a browser and save its contact file without installing Tappd. Your card must be public for people with the link to view it.",
  },
  {
    title: "Saving a card to Apple Wallet or Google Wallet",
    body: "Wallet passes are available only when the corresponding issuer is enabled for Tappd. If you do not see an Apple Wallet or Google Wallet action, save the contact file from the public card instead.",
  },
  {
    title: "Managing your contacts and account",
    body: "Sign in to search and manage saved contacts, edit your card, and export your wallet. To remove your account and its Tappd data, use the self-service deletion controls after signing in.",
  },
  {
    title: "QR scanning, NFC, or a contact that did not save",
    body: "QR scanning uses camera permission. NFC tag writing needs a compatible phone and a writable tag. Contact saving is a separate action from Wallet passes and may ask your phone for Contacts permission.",
  },
];

export default function SupportPage() {
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
            <HelpCircle className="h-4 w-4" /> Tappd help
          </div>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.035em] sm:text-[2.5rem]">How can we help?</h1>
          <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-muted">
            Find help for sharing cards, saving contact details, Wallet availability, and managing your account.
          </p>

          <div className="mt-8 divide-y divide-line border-y border-line">
            {topics.map((topic) => (
              <section key={topic.title} className="py-5 first:pt-0 last:pb-0">
                <h2 className="text-[1rem] font-semibold">{topic.title}</h2>
                <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">{topic.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-7 flex flex-col gap-4 rounded-2xl border border-line bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Still need help?</h2>
              <p className="mt-1 text-sm text-muted">Email the Tappd support address. Never send your password.</p>
            </div>
            <a href="mailto:hello@tappd.app" className="btn btn-primary shrink-0">
              <Mail className="h-4 w-4" />
              Email support
            </a>
          </div>

          <nav aria-label="Account and policy links" className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm">
            <Link href="/account-deletion" className="inline-flex items-center gap-1 font-medium underline underline-offset-2">
              Delete your account <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/privacy" className="font-medium underline underline-offset-2">Privacy policy</Link>
            <Link href="/login" className="font-medium underline underline-offset-2">Sign in</Link>
          </nav>
        </section>
      </div>
    </main>
  );
}
