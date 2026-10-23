import { initials } from "@/lib/utils";
import { cx } from "@/lib/utils";

const TINTS = [
  "linear-gradient(150deg,#e9e6da,#d6d1bf)",
  "linear-gradient(150deg,#dcf5c2,#bfe68f)",
  "linear-gradient(150deg,#d9e8ff,#aecbf7)",
  "linear-gradient(150deg,#ffe3d3,#f7c1a3)",
  "linear-gradient(150deg,#ecdfff,#d2bcf7)",
];

function tintFor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
  return TINTS[sum % TINTS.length];
}

export function Avatar({
  name,
  src,
  size = 44,
  className,
  ring,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  const dimension = { width: size, height: size };
  const base = cx(
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full select-none",
    ring && "ring-2 ring-white",
    className,
  );

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        style={dimension}
        className={cx(base, "object-cover")}
        loading="lazy"
      />
    );
  }

  return (
    <span
      style={{ ...dimension, background: tintFor(name) }}
      className={cx(base, "font-semibold text-[#3c3a32]")}
      aria-label={name}
    >
      <span style={{ fontSize: Math.max(10, Math.round(size * 0.34)) }}>{initials(name)}</span>
    </span>
  );
}
