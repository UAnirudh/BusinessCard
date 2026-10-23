import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ensureCard } from "@/lib/cards";
import { getOrigin } from "@/lib/origin";
import { longDate } from "@/lib/utils";
import { SettingsForm } from "@/components/settings-form";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const card = await ensureCard(user);
  const origin = await getOrigin();

  return (
    <div>
      <header>
        <p className="eyebrow">
          <span className="h-1.5 w-1.5 rounded-full bg-lime-deep" />
          Settings
        </p>
        <h1 className="mt-2 text-[1.8rem] font-semibold tracking-[-0.035em]">Account</h1>
        <p className="mt-1 text-[0.9rem] text-muted">Login, privacy and the exit door — all here.</p>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <SettingsForm
          initialName={user.name}
          initialEmail={user.email}
          cardSlug={`${origin.replace(/^https?:\/\//, "")}/c/${card.slug}`}
          joinedAt={longDate(user.createdAt)}
        />

        <aside className="space-y-3">
          <div className="surface p-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-faint">Your card</p>
            <p className="mt-1 break-all font-mono text-[0.78rem]">{origin.replace(/^https?:\/\//, "")}/c/{card.slug}</p>
            <div className="mt-2 flex flex-col gap-1.5">
              <Link href={`/c/${card.slug}`} target="_blank" className="btn btn-outline btn-sm justify-between">
                Open card
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/app/card" className="btn btn-outline btn-sm justify-between">
                Edit card
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div className="surface p-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-faint">Privacy</p>
            <p className="mt-2 text-[0.78rem] leading-relaxed text-muted">
              Your card is {card.isPublic ? "public" : "private"}. Visitor details are{" "}
              {card.collectLeads ? "accepted" : "not accepted"}. Change both from the card studio.
            </p>
            <Link href="/app/card" className="mt-2 inline-block text-[0.78rem] font-medium underline underline-offset-2">
              Privacy controls
            </Link>
          </div>
          <div className="surface p-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-faint">Need a hand?</p>
            <p className="mt-2 text-[0.78rem] leading-relaxed text-muted">
              NFC tags, imports, broken links — write to{" "}
              <a href="mailto:hello@tappd.app" className="underline underline-offset-2">hello@tappd.app</a>.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
