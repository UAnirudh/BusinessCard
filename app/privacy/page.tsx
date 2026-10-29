import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Tappd handles account, card and contact information.",
};

const sections = [
  {
    title: "Information you add",
    body: "When you create an account, Tappd stores your name, email address, password hash, and the date and version of the Terms of Use you accepted. Your card can include your photo, role, company, bio, location, contact details, social links and tags. Your wallet stores contacts you add or exchange, along with notes, tags, favorites, how you met and when.",
  },
  {
    title: "When someone sends you their details",
    body: "A visitor can send their name and one contact method (email or phone), plus an optional note, without creating an account. That information is added to the card owner's wallet so they can follow up. Signed-in members can exchange their Tappd card details with each other. Only share contact details you are comfortable sending to that card owner.",
  },
  {
    title: "What other people can see",
    body: "New cards start private. When you turn on public sharing in the card editor, anyone with the card link can see the fields you have added, download its contact file and use its QR code. You can make the card private again at any time to stop access through its public link; this does not remove details already saved in another member's Tappd wallet. Visitor details are off until you choose to enable them; turning them off stops new accountless submissions but does not remove contacts already in your wallet. Your wallet and account pages require sign-in.",
  },
  {
    title: "Card views, cookies and this device",
    body: "Tappd records the card viewed, the link source (such as QR or NFC) and the time, then shows aggregate view counts to the card owner. A short-lived session-storage entry prevents repeat counting in the same browser tab session. Sign-in uses an HttpOnly session cookie. The service worker saves only the offline help page; it does not cache signed-in pages, wallet data or API responses. Hosting providers may process connection and diagnostic data in their own server logs.",
  },
  {
    title: "Reports and blocks",
    body: "Anyone can report a public card and optionally add details. If you are signed in, the report is linked to your account; authorized moderators can see the report, the card owner’s account email, and the reporter’s account identity when it is available. Reports are stored for moderator review. Signed-in members can block another member to hide that member’s card from their account and prevent exchanges between those accounts. A moderator may hide a reported card or suspend an account, which makes its cards private and revokes its sessions. Report details and moderation records remain in the active database until the card is deleted or the operator removes the records; backup copies may remain until provider backups rotate out.",
  },
  {
    title: "How information is used and stored",
    body: "Tappd uses this information to display cards, exchange and organize contacts, provide search, export your wallet and protect accounts from abuse. It is stored by the database and hosting services configured for Tappd. When password recovery is enabled, Tappd sends your account email and a one-time reset link through Resend so it can deliver the message. We do not sell card or wallet contact information or use it for third-party ad targeting.",
  },
  {
    title: "Your choices and deletion",
    body: "You can edit or remove card details, export your wallet as CSV, and delete individual contacts in the app. You can delete your account from Settings after entering your password. Account deletion removes the account, card, avatar, sessions, owned wallet records, and Tappd wallet copies linked to your card from the active database. Copies previously exported as vCards or CSVs, saved to phone contacts or external Wallet apps, or shared through other services may remain outside Tappd. Copies held in provider backups may remain until those backups rotate out. A visitor who sent details can ask the card owner to remove them or contact Tappd for help.",
  },
  {
    title: "Security and contact",
    body: `Tappd uses hashed passwords, hashed session identifiers and access controls for signed-in pages. No online service can promise perfect security.${SUPPORT_EMAIL ? ` For a privacy question or removal request, contact ${SUPPORT_EMAIL}.` : " A monitored privacy contact must be configured by the operator before production release."}`,
  },
];

export default function PrivacyPage() {
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
            <ShieldCheck className="h-4 w-4" /> Your information, explained
          </div>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.035em] sm:text-[2.5rem]">Privacy at Tappd</h1>
          <p className="mt-2 text-[0.82rem] text-faint">Last updated October 28, 2026</p>
          <p className="mt-5 max-w-2xl text-[0.95rem] leading-relaxed text-muted">
            Tappd helps people share business cards and remember who they meet. This page explains what the app stores and what happens when you exchange details.
          </p>

          <div className="mt-8 divide-y divide-line">
            {sections.map((section) => (
              <section key={section.title} className="py-5 first:pt-0 last:pb-0">
                <h2 className="text-[1rem] font-semibold">{section.title}</h2>
                <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">{section.body}</p>
              </section>
            ))}
          </div>

          {SUPPORT_EMAIL && <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-4 inline-block text-[0.85rem] font-medium underline underline-offset-4">
            {SUPPORT_EMAIL}
          </a>}
          <p className="mt-2 text-[0.82rem] text-muted">
            <Link href="/account-deletion" className="font-medium underline underline-offset-2">Start an account deletion</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
