"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cx } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy link",
  className,
  iconOnly = false,
}: {
  value: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cx(iconOnly ? "btn btn-outline btn-icon" : "btn btn-outline btn-sm", className)}
      aria-label={label}
      title={label}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
      {!iconOnly && (copied ? "Copied" : label)}
    </button>
  );
}
