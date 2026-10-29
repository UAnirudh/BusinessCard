"use client";

import { useEffect, useState } from "react";
import { Check, Download, QrCode, Share2, X } from "lucide-react";

export function CardActions({
  slug,
  name,
  url,
  vcardUrl,
  walletApple,
  walletGoogle,
}: {
  slug: string;
  name: string;
  url: string;
  vcardUrl: string;
  walletApple: boolean;
  walletGoogle: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `${name} on Tappd`, text: "Here's my card.", url });
        return;
      } catch {
        /* user dismissed the sheet */
      }
    }
    await copyLink();
    setOpen(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const area = document.createElement("textarea");
      area.value = url;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <a
          href={vcardUrl}
          download
          className="flex items-center justify-center gap-2 rounded-xl bg-[#0b0b0d] py-3 text-[0.82rem] font-semibold text-white transition hover:bg-[#26262d]"
        >
          <Download className="h-4 w-4" />
          Download contact
        </a>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white/60 text-[#0b0b0d] transition hover:bg-white"
          aria-label="Show QR code"
        >
          <QrCode className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={share}
          className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white/60 text-[#0b0b0d] transition hover:bg-white"
          aria-label="Share card"
        >
          {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        </button>
      </div>

      <p className="mt-2 text-center text-[0.72rem] leading-relaxed text-muted">
        Open the downloaded contact file to add this person to your phone.
      </p>

      {(walletApple || walletGoogle) && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {walletApple && (
            <a href={`/api/wallet/apple/${encodeURIComponent(slug)}`} className="flex min-h-11 items-center justify-center rounded-xl border border-black/10 bg-white/70 px-3 text-[0.76rem] font-semibold text-[#0b0b0d] transition hover:bg-white">
              Add to Apple Wallet
            </a>
          )}
          {walletGoogle && (
            <a href={`/api/wallet/google/${encodeURIComponent(slug)}`} className="flex min-h-11 items-center justify-center rounded-xl border border-black/10 bg-white/70 px-3 text-[0.76rem] font-semibold text-[#0b0b0d] transition hover:bg-white">
              Add to Google Wallet
            </a>
          )}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Card QR code"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[320px] rounded-3xl bg-white p-5 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#9a9a92]">Scan to connect</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-full border border-line text-muted"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/qr/${slug}`}
              alt={`QR code for ${name}`}
              className="mx-auto mt-4 h-48 w-48 rounded-xl border border-line"
            />
            <p className="mt-4 text-[0.95rem] font-semibold">{name}</p>
            <p className="mt-0.5 text-[0.72rem] text-muted">Point any camera here — no app needed.</p>
            <button type="button" onClick={copyLink} className="btn btn-primary btn-sm mt-4 w-full">
              {copied ? <Check className="h-3.5 w-3.5" /> : null}
              {copied ? "Link copied" : "Copy link instead"}
            </button>
            <p className="mt-3 text-[0.66rem] leading-relaxed text-faint">
              Android can also write this link to an NFC tag from the Tappd share screen.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
