import Link from "next/link";
import { cx } from "@/lib/utils";

export function Glyph({ className, tone = "lime" }: { className?: string; tone?: "lime" | "ink" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="6" className={tone === "lime" ? "fill-ink" : "fill-lime"} />
      <circle cx="8.4" cy="15.6" r="1.7" className={tone === "lime" ? "fill-lime" : "fill-ink"} />
      <path
        d="M11.2 10.8a6.6 6.6 0 0 1 2 4.7"
        strokeWidth="1.9"
        strokeLinecap="round"
        className={tone === "lime" ? "stroke-lime" : "stroke-ink"}
      />
      <path
        d="M13.6 7.2a10.5 10.5 0 0 1 3.2 7.5"
        strokeWidth="1.9"
        strokeLinecap="round"
        className={tone === "lime" ? "stroke-lime" : "stroke-ink"}
      />
    </svg>
  );
}

export function Logo({
  href = "/",
  className,
  tone = "default",
}: {
  href?: string;
  className?: string;
  tone?: "default" | "light";
}) {
  return (
    <Link href={href} className={cx("inline-flex items-center gap-2 no-underline", className)}>
      <Glyph className="h-8 w-8" tone={tone === "light" ? "ink" : "lime"} />
      <span
        className={cx(
          "text-[17px] font-semibold tracking-[-0.03em]",
          tone === "light" ? "text-white" : "text-ink",
        )}
      >
        Tappd
      </span>
    </Link>
  );
}
