import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Logo } from "@/components/logo";
import { CURRENT_TERMS_VERSION } from "@/lib/terms";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms for using Tappd and sharing business card content.",
};

const sections = [
  {
    title: "Using Tappd",
    body: "Tappd helps you create a business card, share it, and organize contacts you meet. Keep your sign-in details private and use an email address you control. You are responsible for activity on your account.",
  },
  {
    title: "Content you add",
    body: "You are responsible for the names, photos, contact details, links, notes, and other material you add to Tappd. Share only material you have the right to use and information you intend to disclose. When you make a card public, anyone with its link may view and save the fields on it.",
  },
  {
    title: "Content and conduct we prohibit",
    body: "Do not use Tappd to post illegal or infringing material; impersonate someone; expose another person’s private information without permission; threaten, harass, bully, or target a person; share sexually exploitative or explicit material; send spam; or use cards to facilitate fraud or other abuse. Do not use contact information obtained from Tappd to send unsolicited bulk messages.",
  },
  {
    title: "Reports, blocks, and moderation",
    body: "You can report a public card and block another member. Tappd may review reports, remove or hide content, limit sharing, suspend accounts, or revoke sessions when needed to protect people or enforce these terms. A filter does not catch every harmful post, and reporting does not guarantee a particular outcome. The service operator must review reports and respond to serious safety concerns.",
  },
  {
    title: "Permission to operate the service",
    body: "You keep ownership of content you add. You give Tappd permission to host, store, display, and transmit that content as needed to provide the service and the sharing features you choose. Making a card private stops people from viewing it through its public Tappd link, but copies already saved in other members’ Tappd wallets may remain. Deleting your account removes Tappd-managed wallet copies linked to your card. It cannot remove copies exported to phones, address books, vCards, other services, or external Wallet apps, and provider backups may take time to expire.",
  },
  {
    title: "Changes and account access",
    body: "You can make your card private and delete your account from the app. We may restrict or suspend an account that violates these terms or threatens the service or its users. If these terms materially change, we will show the updated version and ask you to accept it before you add or publish card content again.",
  },
  {
    title: "Questions",
    body: "For help or to report a concern, visit the Tappd support page.",
  },
];
const updatedDate = new Date(`${CURRENT_TERMS_VERSION}T12:00:00Z`).toLocaleDateString("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

export default function TermsPage() {
  return (
    <main className="min-h-dvh bg-paper px-4 py-6 text-ink sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="flex items-center justify-between">
          <Logo />
          <Link href="/" className="btn btn-outline btn-sm">
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
        </header>
        <section className="surface mt-8 p-5 sm:mt-12 sm:p-9">
          <div className="flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted">
            <FileText className="h-4 w-4" /> Using Tappd
          </div>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.035em] sm:text-[2.5rem]">Terms of Use</h1>
          <p className="mt-2 text-[0.82rem] text-faint">Version {CURRENT_TERMS_VERSION} · Updated {updatedDate}</p>
          <p className="mt-5 max-w-2xl text-[0.95rem] leading-relaxed text-muted">
            These terms explain the basic rules for using Tappd and sharing card content. You must accept them before creating an account or adding card content.
          </p>
          <div className="mt-8 divide-y divide-line">
            {sections.map((section) => (
              <section key={section.title} className="py-5 first:pt-0 last:pb-0">
                <h2 className="text-[1rem] font-semibold">{section.title}</h2>
                <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">{section.body}</p>
              </section>
            ))}
          </div>
          <p className="mt-6 text-[0.82rem] text-muted">
            Read the <Link href="/privacy" className="font-medium underline underline-offset-2">Privacy page</Link> to learn how Tappd handles account and contact information.
          </p>
        </section>
      </div>
    </main>
  );
}
