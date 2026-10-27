import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import {
  ArrowUpRight,
  Eye,
  Globe,
  Mail,
  MapPin,
  Nfc,
  Pencil,
  Phone,
  Link2,
} from "lucide-react";
import { SocialIcon } from "@/components/social-icon";
import { getDb } from "@/db";
import { cardViews } from "@/db/schema";
import { getCardBySlug } from "@/lib/cards";
import { getCurrentUser, getViewer } from "@/lib/auth";
import { hasAvatar } from "@/lib/avatars";
import { getAccent } from "@/lib/site";
import { getOrigin } from "@/lib/origin";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { CardActions } from "@/components/card-actions";
import { ExchangeForm } from "@/components/exchange-form";
import { ViewTracker } from "@/components/view-tracker";
import { normalizeUrl, prettyUrl, firstParam } from "@/lib/utils";
import { walletAvailability } from "@/lib/wallet";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const card = await getCardBySlug(slug);
  if (!card) return { title: "Card not found" };

  // Private card details must not be exposed through metadata to anonymous
  // link previews or crawlers. Owners can still see their own card metadata.
  const user = await getCurrentUser();
  const isOwner = user?.id === card.userId;
  if (!card.isPublic && !isOwner) {
    return {
      title: "Card not found",
      robots: { index: false, follow: false },
    };
  }

  const photo = await hasAvatar(card.id);
  const title = card.headline ? `${card.displayName} — ${card.headline}` : card.displayName;
  const description =
    card.bio ??
    [card.headline, card.company].filter(Boolean).join(" at ") ??
    `${card.displayName} on Tappd`;

  return {
    title,
    description,
    robots: card.isPublic ? undefined : { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "profile",
      images: photo ? [{ url: `/api/avatar/${card.id}`, width: 480, height: 480 }] : undefined,
    },
  };
}

export default async function PublicCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ src?: string | string[] }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const card = await getCardBySlug(slug);
  if (!card) notFound();

  const user = await getCurrentUser();
  const viewer = await getViewer();
  const isOwner = user?.id === card.userId;
  if (!card.isPublic && !isOwner) notFound();

  const [photo, origin] = await Promise.all([hasAvatar(card.id), getOrigin()]);
  const wallets = walletAvailability();
  const accent = getAccent(card.accent);
  const rawSource = firstParam(query.src);
  const source = ["qr", "nfc", "share", "link"].includes(rawSource) ? rawSource : "link";
  const publicUrl = `${origin}/c/${card.slug}`;

  let viewCount = 0;
  if (isOwner) {
    const db = await getDb();
    const rows = await db
      .select({ value: count() })
      .from(cardViews)
      .where(and(eq(cardViews.cardId, card.id)));
    viewCount = Number(rows[0]?.value ?? 0);
  }

  const contactRows = [
    { icon: Mail, label: "Email", value: card.email, href: card.email ? `mailto:${card.email}` : null },
    { icon: Phone, label: "Phone", value: card.phone, href: card.phone ? `tel:${card.phone.replace(/\s+/g, "")}` : null },
    {
      icon: Globe,
      label: "Website",
      value: prettyUrl(card.website),
      href: normalizeUrl(card.website),
    },
    {
      icon: MapPin,
      label: "Based in",
      value: card.location,
      href: card.location ? `https://maps.google.com/?q=${encodeURIComponent(card.location)}` : null,
    },
  ].filter((row) => Boolean(row.value));

  const socials = [
    { key: "linkedin", label: "LinkedIn", href: normalizeUrl(card.linkedin) },
    { key: "x", label: "X", href: normalizeUrl(card.twitter) },
    { key: "github", label: "GitHub", href: normalizeUrl(card.github) },
    { key: "instagram", label: "Instagram", href: normalizeUrl(card.instagram) },
  ].filter((row) => Boolean(row.href));

  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink pb-14 text-white">
      <div
        className="glow left-1/2 top-[-12rem] h-[30rem] w-[30rem] -translate-x-1/2"
        style={{ background: accent.glow }}
      />
      <div className="grid-bg absolute inset-0 opacity-40" />

      <div className="relative">
        <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-5">
          <Logo tone="light" />
          {isOwner ? (
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.7rem] text-white/50 sm:flex">
                <Eye className="h-3 w-3" /> {viewCount} views
              </span>
              <Link href="/app/card" className="btn btn-sm border-white/15 bg-white/5 text-white hover:bg-white/10">
                <Pencil className="h-3.5 w-3.5" />
                Edit card
              </Link>
            </div>
          ) : (
            <Link href="/signup" className="btn btn-sm border-white/15 bg-white/5 text-white hover:bg-white/10">
              Get your card
            </Link>
          )}
        </header>

        <div className="mx-auto w-full max-w-[440px] px-4 pt-2">
          {isOwner && (
            <div className="mb-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[0.72rem] text-white/60">
              <span>You’re viewing your own public card.</span>
              <Link href="/app/tap" className="font-medium text-lime">
                Share it →
              </Link>
            </div>
          )}

          <section
            className="rise relative overflow-hidden rounded-[1.9rem] p-6"
            style={{
              background: accent.base,
              color: accent.ink,
              boxShadow: `0 40px 80px -50px ${accent.glow}, 0 0 0 1px rgba(255,255,255,0.14) inset`,
            }}
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/25 blur-3xl" />

            <div className="relative flex items-center justify-between text-[0.6rem] font-semibold uppercase tracking-[0.16em] opacity-55">
              <span>tappd / card</span>
              <span className="flex items-center gap-1">
                <Nfc className="h-3 w-3" /> tap to save
              </span>
            </div>

            <div className="relative mt-7 flex items-start gap-4">
              <Avatar name={card.displayName} src={photo ? `/api/avatar/${card.id}` : null} size={78} ring />
              <div className="min-w-0 pt-1">
                <h1 className="text-[1.65rem] font-semibold leading-[1.1] tracking-[-0.035em]">
                  {card.displayName}
                </h1>
                <p className="mt-1 text-[0.86rem] opacity-80">
                  {[card.headline, card.company].filter(Boolean).join(" · ") || "Tappd member"}
                </p>
                {card.location && (
                  <p className="mt-1 flex items-center gap-1 text-[0.75rem] opacity-60">
                    <MapPin className="h-3 w-3" /> {card.location}
                  </p>
                )}
              </div>
            </div>

            {card.bio && (
              <p className="relative mt-5 text-[0.86rem] leading-relaxed opacity-80">{card.bio}</p>
            )}

            {card.tags.length > 0 && (
              <div className="relative mt-4 flex flex-wrap gap-1.5">
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md px-1.5 py-0.5 text-[0.68rem] font-medium"
                    style={{ background: accent.chip }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="relative mt-6">
              <CardActions
                slug={card.slug}
                name={card.displayName}
                url={publicUrl}
                vcardUrl={`/api/vcard/${card.slug}`}
                walletApple={card.isPublic && wallets.apple}
                walletGoogle={card.isPublic && wallets.google}
              />
            </div>
          </section>

          {contactRows.length > 0 && (
            <section className="mt-3 overflow-hidden rounded-[1.6rem] bg-white text-ink shadow-[0_20px_50px_-40px_rgba(0,0,0,0.8)]">
              <ul className="divide-y divide-[#f0eee7]">
                {contactRows.map((row) => (
                  <li key={row.label}>
                    <a
                      href={row.href ?? "#"}
                      target={row.href?.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-[#fbfaf6]"
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f4f2e9] text-[#5a5a52]">
                        <row.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-faint">
                          {row.label}
                        </span>
                        <span className="block truncate text-[0.86rem] font-medium">{row.value}</span>
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-faint" />
                    </a>
                  </li>
                ))}
              </ul>

              {socials.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-t border-[#f0eee7] px-5 py-3.5">
                  {socials.map((social) => (
                    <a
                      key={social.key}
                      href={social.href ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#eae7dd] px-2.5 py-1.5 text-[0.75rem] font-medium text-[#4c4c45] transition hover:border-[#cfcbc0] hover:text-ink"
                    >
                      <SocialIcon network={social.key} className="h-3.5 w-3.5" />
                      {social.label}
                    </a>
                  ))}
                </div>
              )}

              {card.links.length > 0 && (
                <div className="grid gap-1.5 border-t border-[#f0eee7] p-3.5 sm:grid-cols-2">
                  {card.links.map((link) => (
                    <a
                      key={`${link.label}-${link.url}`}
                      href={normalizeUrl(link.url) ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-2 rounded-xl border border-[#eae7dd] px-3 py-2.5 text-[0.8rem] font-medium transition hover:border-[#cfcbc0] hover:bg-[#fbfaf6]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Link2 className="h-3.5 w-3.5 shrink-0 text-faint" />
                        <span className="truncate">{link.label}</span>
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-faint" />
                    </a>
                  ))}
                </div>
              )}

              <p className="border-t border-[#f0eee7] bg-[#fbfaf6] px-5 py-2.5 text-center text-[0.68rem] text-faint">
                Open this card in any browser — no Tappd app needed. Save it to your contacts as a vCard.
              </p>
            </section>
          )}

          {!isOwner && (
            <section className="mt-3 rounded-[1.6rem] bg-white p-5 text-ink shadow-[0_20px_50px_-40px_rgba(0,0,0,0.8)]">
              <ExchangeForm
                slug={card.slug}
                ownerFirstName={card.displayName.split(" ")[0]}
                signedIn={Boolean(user)}
                viewerHasCard={Boolean(viewer)}
                viewerName={viewer?.card.displayName ?? ""}
                viewerAccountName={user?.name ?? ""}
                collectLeads={card.collectLeads}
                ownerEmail={card.email}
              />
            </section>
          )}

          {isOwner && (
            <section className="mt-3 grid grid-cols-2 gap-3">
              <Link
                href="/app/tap"
                className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 transition hover:bg-white/[0.08]"
              >
                <Nfc className="h-4 w-4 text-lime" />
                <p className="mt-2 text-[0.86rem] font-medium">Share with a tap</p>
                <p className="mt-0.5 text-[0.72rem] text-white/45">Write your link to an NFC tag or show your QR.</p>
              </Link>
              <Link
                href="/app/connections"
                className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 transition hover:bg-white/[0.08]"
              >
                <Eye className="h-4 w-4 text-lime" />
                <p className="mt-2 text-[0.86rem] font-medium">{viewCount} card views</p>
                <p className="mt-0.5 text-[0.72rem] text-white/45">See who’s landed in your wallet.</p>
              </Link>
            </section>
          )}

          {!user && (
            <div className="mt-8 text-center">
              <p className="text-[0.78rem] text-white/45">Want a card that does this?</p>
              <Link href="/signup" className="btn btn-lime btn-sm mt-2">
                Create yours free
              </Link>
            </div>
          )}

          <footer className="mt-10 flex items-center justify-between border-t border-white/10 pt-5 text-[0.7rem] text-white/30">
            <span>Tappd — digital cards that remember.</span>
            <Link href="/" className="hover:text-white/60">Tappd</Link>
          </footer>
        </div>
      </div>

      {!isOwner && <ViewTracker slug={card.slug} source={source} />}
    </main>
  );
}
