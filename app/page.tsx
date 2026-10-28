import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Download,
  Lock,
  Nfc,
  QrCode,
  Search,
  Smartphone,
  Tags,
  Users,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/avatar";
import { SUPPORT_EMAIL } from "@/lib/support";

const steps = [
  {
    number: "01",
    title: "Build your card",
    body: "Add your role, company, links and photo. Pick an accent and share your public card link.",
    icon: Smartphone,
  },
  {
    number: "02",
    title: "Share your card",
    body: "Hold your phone to an NFC tag, show your QR, or send the link. The other person never installs anything.",
    icon: Nfc,
  },
  {
    number: "03",
    title: "Find them later",
    body: "Save contacts with tags and notes, then find them by name, role, company or location.",
    icon: Search,
  },
];

const features = [
  {
    icon: Search,
    title: "Search your contacts",
    body: "Find people by name, role, company, tags and notes. Results show the details that matched.",
    wide: true,
  },
  {
    icon: Tags,
    title: "Keep useful details",
    body: "Add tags and notes to a contact, including where you met and what to follow up on.",
  },
  {
    icon: Download,
    title: "Yours to keep",
    body: "Export your whole wallet to CSV or save any contact as a .vcf to your phone in one tap.",
  },
  {
    icon: Users,
    title: "Swap details",
    body: "Tappd members can send their card back when they receive yours.",
  },
  {
    icon: BarChart3,
    title: "Track card activity",
    body: "See card views, exchanges and recent introductions.",
  },
  {
    icon: Lock,
    title: "Private where it counts",
    body: "You choose what’s public and what’s only for people you exchange with. Emails stay out of search engines.",
    wide: true,
  },
];

const faqs = [
  {
    q: "Do people need an app to receive my card?",
    a: "No. Your card opens in their browser from a tap, a QR scan or a link. They can save you to their phone contacts or send their details back in a few seconds.",
  },
  {
    q: "What does “tap” mean exactly — do I need NFC?",
    a: "Tappd uses Web NFC to write your card link to any cheap NFC tag (NTAG213/215/216) — stick one on your phone case or a paper card. No tag? Show the QR instead. iPhones read NFC tags natively but cannot write them from the browser, so we point you to the QR flow.",
  },
  {
    q: "Can I import the contacts I already have?",
    a: "Yes. Add people manually one by one, or import a CSV of existing contacts. Everything you import is searchable alongside the people you meet.",
  },
  {
    q: "What happens to my data if I leave?",
    a: "Export everything to CSV first, then delete your account from settings. Deleting removes your card, wallet, sessions and avatar immediately.",
  },
];

export default function LandingPage() {
  return (
    <main className="overflow-x-hidden bg-ink text-white">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-ink/85 backdrop-blur-xl">
        <div className="wrap flex h-16 items-center justify-between gap-6">
          <Logo tone="light" />
          <nav className="hidden items-center gap-7 text-sm text-white/65 md:flex">
            <a href="#how" className="transition hover:text-white">How it works</a>
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#find" className="transition hover:text-white">Search</a>
            <a href="#faq" className="transition hover:text-white">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost !text-white/70 hover:!text-white hover:!bg-white/10">
              Log in
            </Link>
            <Link href="/signup" className="btn btn-lime btn-sm sm:!px-4 sm:!py-2.5">
              Get your card
            </Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative isolate overflow-hidden">
        <div className="glow -left-32 top-[-10rem] h-[26rem] w-[26rem] bg-[#d4ff3f]/25" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink to-transparent" />

        <div className="wrap relative grid items-center gap-14 pb-24 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pb-32 lg:pt-24">
          <div className="rise max-w-xl">
            <span className="eyebrow !text-white/45">
              <span className="h-1.5 w-1.5 rounded-full bg-lime" />
              Digital business cards
            </span>
            <h1 className="display mt-5 text-[clamp(2.6rem,6.2vw,4.4rem)]">
              Tap phones.
              <br />
              Swap cards.
              <br />
              <span className="relative inline-block">
                <span className="absolute inset-x-0 bottom-[0.12em] -z-10 h-[0.34em] rotate-[-1deg] rounded-sm bg-lime" />
                Find anyone
              </span>{" "}
              later.
            </h1>
            <p className="mt-6 max-w-md text-[1.02rem] leading-relaxed text-white/60">
              Share your contact details by NFC, QR code or link. Save the people you meet and find
              them later by name, role, company, tags or notes.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn btn-lime btn-lg">
                Create your card — free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#how" className="btn btn-lg border-white/15 bg-white/5 text-white hover:bg-white/10">
                See how it works
              </a>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[0.8rem] text-white/45">
              {["No app to install", "Works in any browser", "NFC + QR ready"].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-lime" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* card mock */}
          <div className="rise-2 relative mx-auto w-full max-w-[380px]">
            <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-lime/10 blur-2xl" />
            <div className="relative rounded-[2.6rem] border border-white/12 bg-[#141418] p-2.5 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)]">
              <div className="relative overflow-hidden rounded-[2.1rem]">
                <div
                  className="relative px-6 pb-7 pt-6"
                  style={{ background: "linear-gradient(160deg,#e8ff86 0%,#c9ff3d 45%,#a8e021 100%)", color: "#151a05" }}
                >
                  <div className="flex items-center justify-between text-[0.6rem] font-semibold uppercase tracking-[0.16em] opacity-60">
                    <span>tappd / card</span>
                    <span className="flex items-center gap-1">
                      <Nfc className="h-3 w-3" /> NFC ready
                    </span>
                  </div>
                  <div className="mt-7 flex items-center gap-3.5">
                    <Avatar name="Maya Chen" size={58} ring />
                    <div>
                      <p className="text-[1.28rem] font-semibold leading-tight tracking-[-0.02em]">Maya Chen</p>
                      <p className="text-[0.78rem] opacity-75">Product Designer · Northwind</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {["design", "systems", "berlin"].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md px-1.5 py-0.5 text-[0.62rem] font-medium"
                        style={{ background: "rgba(21,26,5,0.12)" }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-6 flex gap-2">
                    <span className="flex-1 rounded-xl bg-[#151a05] py-2.5 text-center text-[0.75rem] font-semibold text-white">
                      Save contact
                    </span>
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#151a05]/20">
                      <QrCode className="h-4 w-4" />
                    </span>
                  </div>
                </div>
                <div className="space-y-2 bg-white px-6 py-4 text-ink">
                  {[
                    ["Email", "maya@northwind.studio"],
                    ["Phone", "+49 151 2244 8890"],
                    ["Web", "northwind.studio"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between border-b border-line-soft pb-2 text-[0.72rem] last:border-0 last:pb-0">
                      <span className="text-faint">{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* proof strip */}
      <section className="border-y border-white/8 bg-ink-2">
        <div className="wrap grid gap-6 py-7 text-center sm:grid-cols-3 sm:text-left">
          {[
            ["NFC", "share from a tag"],
            ["QR code", "scan with a camera"],
            ["Direct link", "opens in a browser"],
          ].map(([big, small]) => (
            <div key={big} className="flex items-baseline justify-center gap-2 sm:justify-start">
              <span className="text-xl font-semibold tracking-tight text-lime">{big}</span>
              <span className="text-sm text-white/45">{small}</span>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="relative scroll-mt-20 bg-ink py-24">
        <div className="wrap">
          <div className="max-w-2xl">
            <span className="eyebrow !text-white/40">How it works</span>
            <h2 className="display mt-4 text-[clamp(2rem,4vw,3rem)]">
              Share your card. Save the details. Find people later.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime/10 text-lime">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs text-white/25">{step.number}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="scroll-mt-20 bg-ink pb-24">
        <div className="wrap">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <span className="eyebrow !text-white/40">Everything included</span>
              <h2 className="display mt-4 text-[clamp(2rem,4vw,3rem)]">
                A card is the start. The wallet is the point.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-white/45">
              Keep contacts, notes and follow-ups together, then search by the details you saved.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`rounded-2xl border border-white/10 bg-white/[0.03] p-6 ${feature.wide ? "md:col-span-2" : ""}`}
              >
                <feature.icon className="h-5 w-5 text-lime" />
                <h3 className="mt-5 text-[1.05rem] font-semibold">{feature.title}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-white/50">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* search showcase */}
      <section id="find" className="scroll-mt-20 border-y border-white/8 bg-ink-2 py-24">
        <div className="wrap grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="eyebrow !text-white/40">The wallet</span>
            <h2 className="display mt-4 text-[clamp(2rem,4vw,3rem)]">
              Find the right contact.
            </h2>
            <p className="mt-5 max-w-lg text-[0.98rem] leading-relaxed text-white/55">
              Search names, roles, companies, locations, tags and notes from one place. Matching
              contacts appear first, with the matched details shown beside each result.
            </p>
            <ul className="mt-7 space-y-3 text-sm text-white/60">
              {[
                "Search by name, role, company or location",
                "Include tags and notes in your search",
                "Filter to your favorite contacts",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn btn-lime mt-8">
              Start your wallet
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-3xl border border-white/10 bg-ink p-5 shadow-2xl">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5" aria-label="Example contact search">
              <Search className="h-4 w-4 text-white/40" />
              <span className="font-mono text-[0.78rem] text-white/80">investor in new york</span>
            </div>
            <p className="mt-3 px-1 text-[0.68rem] uppercase tracking-[0.14em] text-white/30">Example matches</p>
            <div className="mt-2 space-y-2">
              {[
                { name: "Daniel Roth", role: "Partner · Meridian Capital", meta: "Investor · New York" },
                { name: "Priya Anand", role: "Angel · ex-Stripe", meta: "Investor · New York" },
                { name: "Marcus Webb", role: "VC Associate · Fjord", meta: "New York" },
              ].map((row, index) => (
                <div
                  key={row.name}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    index === 0 ? "border-lime/40 bg-lime/[0.07]" : "border-white/8 bg-white/[0.02]"
                  }`}
                >
                  <Avatar name={row.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.86rem] font-medium">{row.name}</p>
                    <p className="truncate text-[0.72rem] text-white/45">{row.role}</p>
                    <p className="mt-0.5 truncate text-[0.66rem] text-white/30">{row.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* faq */}
      <section id="faq" className="scroll-mt-20 bg-ink py-24">
        <div className="wrap grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="eyebrow !text-white/40">Questions</span>
            <h2 className="display mt-4 text-[clamp(1.9rem,3.5vw,2.6rem)]">The details people ask about.</h2>
            {SUPPORT_EMAIL && <p className="mt-4 text-sm leading-relaxed text-white/45">
              Still curious? Write to{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-lime underline decoration-lime/30 underline-offset-4">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>}
          </div>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {faqs.map((faq) => (
              <details key={faq.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[0.98rem] font-medium">
                  {faq.q}
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/15 text-white/40 transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* final cta */}
      <section className="bg-ink pb-20">
        <div className="wrap">
          <div className="relative overflow-hidden rounded-[2rem] bg-lime px-7 py-12 text-ink sm:px-12">
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/30 blur-3xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-8">
              <div className="max-w-xl">
                <p className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.14em] opacity-60">
                  Free to start
                </p>
                <h2 className="display mt-3 text-[clamp(1.9rem,4vw,2.8rem)]">
                  Create a card you can share anywhere.
                </h2>
              </div>
              <Link href="/signup" className="btn btn-primary btn-lg">
                Claim your handle
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 bg-ink py-10">
        <div className="wrap flex flex-wrap items-center justify-between gap-6 text-sm text-white/40">
          <div className="flex items-center gap-3">
            <Logo tone="light" />
            <span className="hidden text-white/25 sm:inline">·</span>
            <span className="hidden sm:inline">Share a card. Keep in touch.</span>
          </div>
          <div className="flex flex-wrap gap-5">
            <Link href="/login" className="hover:text-white">Log in</Link>
            <Link href="/signup" className="hover:text-white">Create a card</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/support" className="hover:text-white">Support</Link>
            <Link href="/account-deletion" className="hover:text-white">Delete account</Link>
            <a href="#faq" className="hover:text-white">FAQ</a>
            {SUPPORT_EMAIL && <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white">Contact</a>}
          </div>
          <p className="w-full text-xs text-white/25 sm:w-auto">© {new Date().getFullYear()} Tappd</p>
        </div>
      </footer>
    </main>
  );
}
