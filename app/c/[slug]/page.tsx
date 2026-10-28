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
  Pencil,
  Phone,
  Link2,
} from "lucide-react";
import { SocialIcon } from "@/components/social-icon";
import { getDb } from "@/db";
import { cardViews, userBlocks } from "@/db/schema";
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
import { CardSafetyActions } from "@/components/card-safety-actions";

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

  if (user && !isOwner) {
    const db = await getDb();
    const [block] = await db
      .select({ blockerUserId: userBlocks.blockerUserId })
      .from(userBlocks)
      .where(and(eq(userBlocks.blockerUserId, user.id), eq(userBlocks.blockedUserId, card.userId)))
      .limit(1);
    if (block) return { title: "Card hidden" };
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

  let viewerBlockedCardOwner = false;
  if (user && !isOwner) {
    const db = await getDb();
    const [block] = await db
      .select({ blockerUserId: userBlocks.blockerUserId })
      .from(userBlocks)
      .where(and(eq(userBlocks.blockerUserId, user.id), eq(userBlocks.blockedUserId, card.userId)))
      .limit(1);
    viewerBlockedCardOwner = Boolean(block);
  }

  if (viewerBlockedCardOwner) {
    return (
      <main className="grid min-h-dvh place-items-center bg-paper px-5 text-ink">
        <div className="surface w-full max-w-md p-6 text-center">
          <h1 className="text-xl font-semibold">You blocked this member</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">Their card is hidden from your account and you can’t exchange details with them while the block is active.</p>
          <div className="mt-4 text-left"><CardSafetyActions slug={card.slug} signedIn initiallyBlocked /></div>
        </div>
      </main>
    );
  }

  const [photo, origin] = await Promise.all([hasAvatar(card.id), getOrigin()]);
  const wallets = await walletAvailability();
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
    <main className="min-h-dvh bg-[#f6f5f0] pb-12 text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-4">
          <Logo />
          {isOwner ? (
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full bg-[#f6f5f0] px-2.5 py-1 text-[0.7rem] text-muted sm:flex">
                <Eye className="h-3 w-3" /> {viewCount} views
              </span>
              <Link href="/app/card" className="btn btn-outline btn-sm">
                <Pencil className="h-3.5 w-3.5" />
                Edit card
              </Link>
            </div>
          ) : (
            <Link href="/signup" className="btn btn-outline btn-sm">
              Get your card
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-[480px] px-4 pt-7 sm:pt-10">
        {isOwner && (
          <p className="mb-3 text-center text-[0.78rem] text-muted">Preview</p>
        )}

        <section className="surface relative overflow-hidden rounded-3xl p-5 shadow-[0_16px_40px_-32px_rgba(11,11,13,0.35)] sm:p-7">
          <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: accent.swatch }} />

          <div className="flex items-start gap-4 pt-1">
            <Avatar name={card.displayName} src={photo ? `/api/avatar/${card.id}` : null} size={68} ring />
            <div className="min-w-0 pt-1">
              <h1 className="break-words text-[1.65rem] font-semibold leading-[1.1] tracking-[-0.035em]">
                {card.displayName}
              </h1>
              {(card.headline || card.company) && (
                <p className="mt-1 text-[0.86rem] text-muted">
                  {[card.headline, card.company].filter(Boolean).join(" · ")}
                </p>
              )}
              {card.location && (
                <p className="mt-1 flex items-center gap-1 text-[0.75rem] text-muted">
                  <MapPin className="h-3 w-3" /> {card.location}
                </p>
              )}
            </div>
          </div>

          {card.bio && (
            <p className="mt-5 text-[0.9rem] leading-relaxed text-[#484842]">{card.bio}</p>
          )}

          {card.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {card.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-[#f1efe7] px-2 py-1 text-[0.7rem] font-medium text-[#57574f]">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 border-t border-line-soft pt-5">
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
          <section className="surface mt-3 overflow-hidden rounded-3xl">
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

            <p className="border-t border-[#f0eee7] bg-[#fbfaf6] px-5 py-2.5 text-center text-[0.72rem] text-muted">
              Works in any browser. No app needed to save this contact.
            </p>
          </section>
        )}

        {!isOwner && (
          <section className="surface mt-3 rounded-3xl p-5">
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

        {!isOwner && <CardSafetyActions slug={card.slug} signedIn={Boolean(user)} />}

        <footer className="mt-10 flex items-center justify-between border-t border-line pt-5 text-[0.7rem] text-faint">
          <span>Keep your contacts and follow-ups together.</span>
          <Link href="/" className="hover:text-ink">Tappd</Link>
        </footer>
      </div>

      {!isOwner && <ViewTracker slug={card.slug} source={source} />}
    </main>
  );
}
