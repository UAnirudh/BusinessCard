import { QrCode } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { getAccent } from "@/lib/site";
import { cx } from "@/lib/utils";

export type PreviewCard = {
  displayName: string;
  headline: string | null;
  company: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  accent: string;
  tags: string[];
  avatarUrl?: string | null;
};

export function CardPreview({
  card,
  className,
  compact = false,
}: {
  card: PreviewCard;
  className?: string;
  compact?: boolean;
}) {
  const accent = getAccent(card.accent);

  return (
    <div
      className={cx("overflow-hidden rounded-3xl shadow-[0_30px_60px_-40px_rgba(11,11,13,0.55)]", className)}
      style={{ background: accent.base, color: accent.ink }}
    >
      <div className={cx("px-6", compact ? "pb-5 pt-5" : "pb-7 pt-6")}>
        <div className="flex items-center justify-between text-[0.68rem] font-medium opacity-65">
          <span>Tappd card</span>
          <span>Preview</span>
        </div>

        <div className={cx("flex items-center gap-3.5", compact ? "mt-5" : "mt-8")}>
          <Avatar name={card.displayName} src={card.avatarUrl} size={compact ? 46 : 60} ring />
          <div className="min-w-0">
            <p className={cx("truncate font-semibold leading-tight tracking-[-0.02em]", compact ? "text-[1.05rem]" : "text-[1.35rem]")}>
              {card.displayName || "Your name"}
            </p>
            <p className="truncate text-[0.78rem] opacity-75">
              {[card.headline, card.company].filter(Boolean).join(" · ") || "Add your role and company"}
            </p>
            {card.location && <p className="mt-0.5 truncate text-[0.7rem] opacity-55">{card.location}</p>}
          </div>
        </div>

        {card.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {card.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="rounded-md px-1.5 py-0.5 text-[0.62rem] font-medium"
                style={{ background: accent.chip }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <span
            className="flex-1 rounded-xl py-2.5 text-center text-[0.75rem] font-semibold"
            style={{ background: accent.ink, color: accent.key === "ink" ? "#0b0b0d" : "#fff" }}
          >
            Save contact
          </span>
          <span className="grid h-10 w-10 place-items-center rounded-xl border" style={{ borderColor: accent.chip, background: accent.chip }}>
            <QrCode className="h-4 w-4" />
          </span>
        </div>
      </div>

      <div className="space-y-2 bg-white px-6 py-4" style={{ color: "#0b0b0d" }}>
        {[
          ["Email", card.email],
          ["Phone", card.phone],
          ["City", card.location],
        ]
          .filter(([, value]) => Boolean(value))
          .slice(0, 3)
          .map(([label, value]) => (
            <div
              key={label as string}
              className="flex items-center justify-between gap-4 border-b border-[#f0eee7] pb-2 text-[0.72rem] last:border-0 last:pb-0"
            >
              <span className="shrink-0 text-[#9a9a92]">{label}</span>
              <span className="truncate font-medium">{value}</span>
            </div>
          ))}
        {!card.email && !card.phone && !card.location && (
          <p className="py-1 text-[0.72rem] text-[#9a9a92]">Add contact details so people can reach you.</p>
        )}
      </div>
    </div>
  );
}
