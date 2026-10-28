import Link from "next/link";
import {
  ArrowRight,
  Check,
  Download,
  Lock,
  Nfc,
  QrCode,
  Search,
  Smartphone,
  Tags,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { SUPPORT_EMAIL } from "@/lib/support";

const steps = [
  {
    number: "01",
    title: "Make your card",
    body: "Add the details you want to share, then choose what stays private.",
    icon: Smartphone,
  },
  {
    number: "02",
    title: "Share it anywhere",
    body: "Use a link, QR code or NFC tag. People can open your card in their browser.",
    icon: Nfc,
  },
  {
    number: "03",
    title: "Add a contact",
    body: "Save the people you meet, add a note and find them when you need them.",
    icon: Search,
  },
];

const features = [
  {
    icon: Search,
    title: "Find people again",
    body: "Search your contacts by name, role, company, location, tags or notes.",
  },
  {
    icon: Tags,
    title: "Keep the context",
    body: "Add a meeting note and a follow-up date to each contact.",
  },
  {
    icon: Download,
    title: "Take your contacts with you",
    body: "Save a contact to your phone or export your wallet as a CSV file.",
  },
  {
    icon: Lock,
    title: "Choose what you share",
    body: "Keep personal details private and share only what belongs on your public card.",
  },
];

const faqs = [
  {
    q: "Does someone need Tappd to see my card?",
    a: "No. Your card opens in a web browser from a link, QR code or NFC tag. They can save your details to their phone contacts without creating an account.",
  },
  {
    q: "Do I need an NFC card or tag?",
    a: "No. You can share your link or show a QR code. If you have an NFC tag, you can use it to open your card with a tap. NFC tag writing depends on browser and device support; QR and link sharing work as alternatives.",
  },
  {
    q: "Can I bring in contacts I already have?",
    a: "Yes. Add contacts one at a time or import a CSV file. Imported contacts are searchable alongside the people you meet through Tappd.",
  },
  {
    q: "Can I leave with my data?",
    a: "You can export your contacts as a CSV file and delete your account from settings.",
  },
];

export default function LandingPage() {
  return (
    <main className="overflow-x-hidden bg-[#f7f6f2] text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-sm">
        <div className="wrap flex h-16 items-center justify-between gap-4">
          <Logo />
          <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm text-muted md:flex">
            <a href="#how" className="transition hover:text-ink">How it works</a>
            <a href="#features" className="transition hover:text-ink">Your contacts</a>
            <a href="#faq" className="transition hover:text-ink">FAQ</a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/login" className="btn btn-ghost">Log in</Link>
            <Link href="/signup" className="btn btn-primary btn-sm sm:!px-4 sm:!py-2.5">
              Create a card
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-line bg-white">
        <div className="wrap grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:py-24">
          <div className="max-w-2xl">
            <p className="eyebrow">A digital business card and contact wallet</p>
            <h1 className="mt-5 max-w-[13ch] text-[clamp(2.65rem,6vw,4.4rem)] font-semibold leading-[1.02] tracking-[-0.055em] text-ink">
              Share your details. Remember who you meet.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              One card for links, QR codes and NFC. Save new contacts, add a note, and find the right person when it’s time to follow up.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn btn-primary btn-lg">
                Create your card <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <a href="#how" className="btn btn-outline btn-lg">See how it works</a>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
              {["Free to start", "No app needed to receive", "Save contacts to your phone"].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check aria-hidden="true" className="h-4 w-4 text-[#526b13]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mx-auto w-full max-w-[400px] rounded-3xl border border-line bg-[#f7f6f2] p-3 sm:p-4">
            <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_12px_32px_-28px_rgba(11,11,13,0.4)] sm:p-6">
              <div className="flex items-center justify-between border-b border-line-soft pb-4">
                <span className="text-xs font-semibold text-muted">Example card</span>
                <span className="rounded-full bg-[#f2f5e9] px-2.5 py-1 text-xs font-medium text-[#526b13]">Public</span>
              </div>
              <div className="flex items-center gap-4 py-6">
                <div aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#eef0e8] text-sm font-semibold text-[#55584d]">You</div>
                <div className="min-w-0">
                  <p className="truncate text-xl font-semibold tracking-tight">Your name</p>
                  <p className="mt-1 truncate text-sm text-muted">Role · Company</p>
                  <p className="mt-1 text-sm text-muted">City, State</p>
                </div>
              </div>
              <p className="text-sm leading-6 text-[#484842]">
                Choose which details to share.
              </p>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-line-soft pt-4 text-xs text-muted">
                <span>Opens in any browser</span>
                <span className="flex items-center gap-1.5"><QrCode aria-hidden="true" className="h-4 w-4" /> Link, QR or NFC</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Ways to share" className="border-b border-line bg-[#f7f6f2]">
        <div className="wrap grid gap-4 py-5 text-sm sm:grid-cols-3 sm:gap-6 sm:py-6">
          {[
            { title: "Link", text: "Send it in a message or email" },
            { title: "QR code", text: "Show it on your phone" },
            { title: "NFC tag", text: "Open your card from a tag" },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3 sm:justify-center">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-white text-muted">
                {item.title === "Link" ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : item.title === "QR code" ? <QrCode aria-hidden="true" className="h-4 w-4" /> : <Nfc aria-hidden="true" className="h-4 w-4" />}
              </span>
              <span><strong className="font-semibold text-ink">{item.title}</strong><span className="ml-2 text-muted">{item.text}</span></span>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="scroll-mt-20 py-16 sm:py-24">
        <div className="wrap">
          <div className="max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Keep the details that make a follow-up personal.</h2>
          </div>
          <div className="mt-9 grid gap-3 md:grid-cols-3 md:gap-4">
            {steps.map((step) => (
              <article key={step.number} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f2f5e9] text-[#526b13]">
                    <step.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-medium tabular-nums text-faint">{step.number}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-20 border-y border-line bg-white py-16 sm:py-24">
        <div className="wrap grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="max-w-md">
            <p className="eyebrow">Your contact wallet</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Your contacts, with the context you need.</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              Save who you met, where you met, and when you want to follow up.
            </p>
            <Link href="/signup" className="btn btn-primary mt-6">
              Start your wallet <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {features.map((feature) => (
              <article key={feature.title} className="flex gap-4 py-5 first:pt-5 last:pb-5 sm:gap-5 sm:py-6">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f7f6f2] text-[#526b13]">
                  <feature.icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{feature.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 py-16 sm:py-24">
        <div className="wrap grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <div>
            <p className="eyebrow">Questions</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">Good to know.</h2>
            {SUPPORT_EMAIL && <p className="mt-4 text-sm leading-6 text-muted">
              Need help? <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-ink underline underline-offset-4">Email us</a>.
            </p>}
          </div>
          <div className="divide-y divide-line border-y border-line">
            {faqs.map((faq) => (
              <details key={faq.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium marker:hidden">
                  {faq.q}
                  <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-muted transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-2xl pr-10 text-sm leading-6 text-muted">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white py-10 sm:py-14">
        <div className="wrap flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-muted">Free to start</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Create a card you can share anywhere.</h2>
          </div>
          <Link href="/signup" className="btn btn-primary btn-lg">
            Create your card <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="bg-[#f7f6f2] py-8 sm:py-10">
        <div className="wrap flex flex-wrap items-center justify-between gap-5 text-sm text-muted">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden text-faint sm:inline">Your card and contacts in one place.</span>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/support" className="hover:text-ink">Support</Link>
            <Link href="/account-deletion" className="hover:text-ink">Delete account</Link>
            <a href="#faq" className="hover:text-ink">FAQ</a>
          </nav>
          <p className="w-full text-xs text-faint sm:w-auto">© {new Date().getFullYear()} Tappd</p>
        </div>
      </footer>
    </main>
  );
}
