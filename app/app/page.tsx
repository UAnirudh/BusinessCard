import Link from "next/link";
import { and, count, desc, eq, gte } from "drizzle-orm";
import {
  ArrowUpRight,
  Check,
  Circle,
  Download,
  Eye,
  Nfc,
  Plus,
  QrCode,
  Search,
  Users,
} from "lucide-react";
import { getDb } from "@/db";
import { cardViews, connections } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensureCard, cardPath, avatarUrl } from "@/lib/cards";
import { getOrigin } from "@/lib/origin";
import { hasAvatar, hasAvatarMany } from "@/lib/avatars";
import { Avatar } from "@/components/avatar";
import { CardPreview } from "@/components/card-preview";
import { CopyButton } from "@/components/copy-button";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SOURCE_LABELS: Record<string, string> = {
  exchange: "Tapped",
  lead: "Card form",
  manual: "Manual",
  import: "Imported",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const card = await ensureCard(user);
  const db = await getDb();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const origin = await getOrigin();

  const [totals, thisWeek, recent, viewRows, totalViews, favoriteCount, hasPhoto] = await Promise.all([
    db.select({ value: count() }).from(connections).where(eq(connections.ownerId, user.id)),
    db
      .select({ value: count() })
      .from(connections)
      .where(and(eq(connections.ownerId, user.id), gte(connections.createdAt, weekAgo))),
    db
      .select()
      .from(connections)
      .where(eq(connections.ownerId, user.id))
      .orderBy(desc(connections.createdAt))
      .limit(5),
    db
      .select({ createdAt: cardViews.createdAt })
      .from(cardViews)
      .where(and(eq(cardViews.cardId, card.id), gte(cardViews.createdAt, weekAgo))),
    db.select({ value: count() }).from(cardViews).where(eq(cardViews.cardId, card.id)),
    db
      .select({ value: count() })
      .from(connections)
      .where(and(eq(connections.ownerId, user.id), eq(connections.favorite, true))),
    hasAvatar(card.id),
  ]);

  const avatarSet = await hasAvatarMany(recent.map((row) => row.cardId).filter(Boolean) as string[]);
  const totalConnections = Number(totals[0]?.value ?? 0);
  const weekConnections = Number(thisWeek[0]?.value ?? 0);
  const viewsTotal = Number(totalViews[0]?.value ?? 0);
  const viewsWeek = viewRows.length;
  const favorites = Number(favoriteCount[0]?.value ?? 0);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return {
      date,
      key: date.toDateString(),
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      count: 0,
    };
  });
  for (const view of viewRows) {
    const key = new Date(view.createdAt).toDateString();
    const bucket = days.find((day) => day.key === key);
    if (bucket) bucket.count += 1;
  }
  const peak = Math.max(1, ...days.map((day) => day.count));

  const publicUrl = `${origin}${cardPath(card.slug)}`;
  const displayHost = origin.replace(/^https?:\/\//, "");
  const checklist = [
    { done: hasPhoto, label: "Add a profile photo", href: "/app/card" },
    { done: Boolean(card.headline && card.company), label: "Add your role and company", href: "/app/card" },
    { done: Boolean(card.email || card.phone), label: "Add contact details", href: "/app/card" },
    { done: totalConnections > 0, label: "Save your first contact", href: "/app/connections?new=1" },
  ];
  const completed = checklist.filter((item) => item.done).length;
  const percent = Math.round((completed / checklist.length) * 100);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-deep" />
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-2 text-[1.85rem] font-semibold leading-tight tracking-[-0.035em] sm:text-[2.1rem]">
            {greeting}, {user.name.split(" ")[0]}.
          </h1>
          <p className="mt-1 text-[0.9rem] text-muted">
            {weekConnections > 0
              ? `${weekConnections} new ${weekConnections === 1 ? "contact" : "contacts"} this week.`
              : card.isPublic
                ? "Your public card is ready to share."
                : "Your card is private. Only you can see it."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={cardPath(card.slug)} target="_blank" className="btn btn-outline btn-sm">
            {card.isPublic ? "View public card" : "Preview card"}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <Link href="/app/tap" className="btn btn-primary btn-sm">
            <Nfc className="h-3.5 w-3.5" />
            Share card
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-[0.78rem] font-medium text-muted">In your wallet</p>
            <Users className="h-4 w-4 text-faint" />
          </div>
          <p className="mt-3 text-[2rem] font-semibold leading-none tracking-tight">{totalConnections}</p>
          <p className="mt-2 text-[0.78rem] text-muted">
            {weekConnections > 0 ? `+${weekConnections} this week` : "Add people as you meet them"}
            {favorites > 0 && <span className="text-faint"> · {favorites} favorite{favorites === 1 ? "" : "s"}</span>}
          </p>
        </div>

        <div className="surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-[0.78rem] font-medium text-muted">Card views</p>
            <Eye className="h-4 w-4 text-faint" />
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[2rem] font-semibold leading-none tracking-tight">{viewsTotal}</p>
              <p className="mt-2 text-[0.78rem] text-muted">
                {viewsWeek > 0 ? `${viewsWeek} in the last 7 days` : "No views this week yet"}
              </p>
            </div>
            <div className="flex items-end gap-1" aria-hidden="true">
              {days.map((day) => (
                <span
                  key={day.key}
                  title={`${day.label}: ${day.count}`}
                  className="w-1.5 rounded-full bg-[#e7e4d9]"
                  style={{
                    height: `${Math.max(6, (day.count / peak) * 40)}px`,
                    background: day.count > 0 ? "#0b0b0d" : undefined,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="surface flex flex-col justify-between p-5">
          <div className="flex items-center justify-between">
            <p className="text-[0.78rem] font-medium text-muted">Card link</p>
            <QrCode className="h-4 w-4 text-faint" />
          </div>
          <div className="mt-3">
            <p className="truncate font-mono text-[0.82rem]">{displayHost}/c/{card.slug}</p>
            <div className="mt-3 flex gap-1.5">
              <CopyButton value={publicUrl} label="Copy" />
              <Link href="/app/tap" className="btn btn-outline btn-sm">
                QR & NFC
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[0.95rem] font-semibold">Your card</h2>
              <p className="text-[0.78rem] text-muted">What people see when they tap, scan or open your link.</p>
            </div>
            <Link href="/app/card" className="btn btn-outline btn-sm">
              Edit card
            </Link>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-[260px_1fr]">
            <CardPreview
              compact
              card={{
                displayName: card.displayName,
                headline: card.headline,
                company: card.company,
                location: card.location,
                email: card.email,
                phone: card.phone,
                accent: card.accent,
                tags: card.tags,
                avatarUrl: hasPhoto ? avatarUrl(card.id) : null,
              }}
            />
            <div className="space-y-3">
              <div className="rounded-xl border border-line-soft bg-[#fbfaf7] p-3">
                <p className="text-[0.74rem] font-medium text-muted">Card URL</p>
                <p className="mt-1 break-all font-mono text-[0.75rem] text-ink">{publicUrl}</p>
              </div>
              <div className="rounded-xl border border-line-soft p-3">
                <p className="text-[0.74rem] font-medium text-muted">Visibility</p>
                <p className="mt-1 text-[0.82rem]">
                  {card.isPublic ? "Public — anyone with the link can open it" : "Private — only you can see it"}
                </p>
                <p className="mt-1 text-[0.78rem] text-muted">
                  {card.collectLeads ? "Collecting details from visitors" : "Not collecting visitor details"}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {card.tags.length > 0 ? (
                  card.tags.map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))
                ) : (
                  <span className="hint">Add tags to make contacts easier to find.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[0.95rem] font-semibold">Set up your card</h2>
                <p className="text-[0.78rem] text-muted">{completed} of {checklist.length} complete</p>
              </div>
              <span className="chip chip-lime">{percent}%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eeece3]">
              <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${percent}%` }} />
            </div>
            <ul className="mt-4 space-y-1.5">
              {checklist.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-[0.82rem] transition hover:bg-[#f7f5ee]"
                  >
                    {item.done ? (
                      <Check className="h-4 w-4 shrink-0 text-ok" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-[#d7d3c6]" />
                    )}
                    <span className={item.done ? "text-faint line-through" : "text-ink"}>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface p-5">
            <h2 className="text-[0.95rem] font-semibold">Quick actions</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { href: "/app/connections?new=1", label: "Add a contact", icon: Plus },
                { href: "/app/find", label: "Find someone", icon: Search },
                { href: "/app/tap", label: "Tap & share", icon: Nfc },
                { href: "/api/export", label: "Export CSV", icon: Download },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-[0.8rem] font-medium transition hover:border-[#d3cfc1] hover:bg-[#fbfaf6]"
                >
                  <action.icon className="h-4 w-4 text-muted" />
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
          <div>
            <h2 className="text-[0.95rem] font-semibold">Recent contacts</h2>
            <p className="text-[0.78rem] text-muted">Your five most recent contacts.</p>
          </div>
          <Link href="/app/connections" className="btn btn-ghost btn-sm">
            View all
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f3f1e8]">
              <Users className="h-5 w-5 text-muted" />
            </span>
            <p className="mt-3 text-[0.95rem] font-medium">No contacts yet.</p>
            <p className="mt-1 max-w-sm text-[0.82rem] text-muted">
              Share your card, or add someone after a conversation.
            </p>
            <div className="mt-4 flex gap-2">
              <Link href="/app/tap" className="btn btn-primary btn-sm">Share my card</Link>
              <Link href="/app/connections?new=1" className="btn btn-outline btn-sm">Add manually</Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-line-soft">
            {recent.map((person) => (
              <li key={person.id}>
                <Link
                  href={`/app/connections/${person.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-[#fbfaf6]"
                >
                  <Avatar
                    name={person.name}
                    size={38}
                    src={person.cardId && avatarSet.has(person.cardId) ? avatarUrl(person.cardId) : null}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.88rem] font-medium">{person.name}</p>
                    <p className="truncate text-[0.76rem] text-muted">
                      {[person.headline, person.company].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <span className="chip hidden sm:inline-flex">{SOURCE_LABELS[person.source] ?? person.source}</span>
                  <span className="hidden w-16 text-right text-[0.72rem] text-faint sm:block">
                    {timeAgo(person.createdAt)}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
