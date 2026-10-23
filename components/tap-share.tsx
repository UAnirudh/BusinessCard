"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Nfc,
  QrCode,
  ScanLine,
  Share2,
  Smartphone,
  X,
} from "lucide-react";
import { cx } from "@/lib/utils";

type NdefRecord = { recordType: string; data?: DataView; encoding?: string };
type NdefReader = {
  write: (message: { records: Array<{ recordType: string; data: string }> }) => Promise<void>;
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  onreading: ((event: { message: { records: NdefRecord[] } }) => void) | null;
  onreadingerror: ((event: Event) => void) | null;
};
type NdefReaderCtor = new () => NdefReader;

type Tab = "tag" | "scan";

export function TapShare({
  slug,
  url,
  displayName,
}: {
  slug: string;
  url: string;
  displayName: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("tag");
  const [copied, setCopied] = useState(false);
  const [nfcStatus, setNfcStatus] = useState<{ tone: "idle" | "ok" | "error" | "busy"; message: string }>({
    tone: "idle",
    message: "Hold a blank NFC tag to the back of your phone to write your card to it.",
  });
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);
  const [secure, setSecure] = useState(true);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "NDEFReader" in window &&
      window.isSecureContext;
    setNfcSupported(supported);
    setSecure(typeof window !== "undefined" ? window.isSecureContext : true);
  }, []);

  async function copy() {
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

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${displayName} on Tappd`, text: "Here is my card.", url });
        return;
      } catch {
        /* dismissed */
      }
    }
    await copy();
  }

  const writeTag = useCallback(async () => {
    const Ctor = (window as unknown as { NDEFReader?: NdefReaderCtor }).NDEFReader;
    if (!Ctor) {
      setNfcStatus({ tone: "error", message: "This browser can’t write NFC tags. Use Chrome on Android, or share the QR instead." });
      return;
    }
    try {
      setNfcStatus({ tone: "busy", message: "Ready — hold a blank NFC tag to the back of your phone…" });
      const writer = new Ctor();
      await writer.write({ records: [{ recordType: "url", data: url }] });
      setNfcStatus({ tone: "ok", message: "Tag written. It now opens your card — try it with any phone." });
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      setNfcStatus({
        tone: "error",
        message:
          name === "NotAllowedError"
            ? "NFC permission was blocked. Allow NFC for this site in your browser settings and try again."
            : name === "NotSupportedError"
              ? "This device doesn’t support NFC, or NFC is turned off."
              : "Couldn’t write that tag. Make sure it’s a blank NDEF tag (NTAG213/215/216) and hold it still.",
      });
    }
  }, [url]);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-deep" />
            Tap & share
          </p>
          <h1 className="mt-2 text-[1.8rem] font-semibold tracking-[-0.035em]">Put your card in their phone</h1>
          <p className="mt-1 max-w-xl text-[0.9rem] leading-relaxed text-muted">
            Show the QR, write your link to an NFC tag, or scan someone else’s code to save them
            instantly. Nothing to install on either side.
          </p>
        </div>
        <Link href={`/c/${slug}`} target="_blank" className="btn btn-outline btn-sm">
          <ExternalLink className="h-3.5 w-3.5" />
          Open my card
        </Link>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* QR card */}
        <section className="surface flex flex-col items-center p-6 text-center">
          <span className="chip chip-lime">Scan to connect</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/qr/${slug}`}
            alt={`QR code for ${displayName}`}
            className="mt-5 h-[220px] w-[220px] rounded-2xl border border-line bg-white p-2"
          />
          <p className="mt-4 text-[1.02rem] font-semibold">{displayName}</p>
          <p className="mt-0.5 break-all font-mono text-[0.72rem] text-muted">{url.replace(/^https?:\/\//, "")}</p>

          <div className="mt-5 grid w-full gap-2">
            <button type="button" onClick={share} className="btn btn-primary">
              <Share2 className="h-4 w-4" />
              Share my card
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={copy} className="btn btn-outline btn-sm">
                {copied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <a href={`/api/qr/${slug}`} download={`tappd-${slug}-qr.svg`} className="btn btn-outline btn-sm">
                <Download className="h-3.5 w-3.5" />
                QR file
              </a>
            </div>
          </div>
          <p className="hint mt-4">
            Tip: add the QR to a slide, a booth screen or the back of your phone case — it works in any
            camera app.
          </p>
        </section>

        {/* tools */}
        <div className="space-y-4">
          <div className="surface overflow-hidden">
            <div className="flex border-b border-line-soft">
              {(
                [
                  { key: "tag", label: "Write an NFC tag", icon: Nfc },
                  { key: "scan", label: "Scan someone’s QR", icon: ScanLine },
                ] as const
              ).map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setTab(entry.key)}
                  className={cx(
                    "flex flex-1 items-center justify-center gap-2 px-4 py-3 text-[0.85rem] font-medium transition",
                    tab === entry.key ? "bg-[#fbfaf6] text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  <entry.icon className="h-4 w-4" />
                  {entry.label}
                </button>
              ))}
            </div>

            {tab === "tag" ? (
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f3f1e8]">
                    <Smartphone className="h-5 w-5 text-muted" />
                  </span>
                  <div>
                    <h2 className="text-[0.95rem] font-semibold">Stick a tag on your phone case</h2>
                    <p className="mt-1 text-[0.82rem] leading-relaxed text-muted">
                      A blank NTAG213 costs about a dollar. Write your card link once, then anyone can
                      tap their phone on yours to open it — no app, no camera.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 rounded-xl border border-line bg-[#fbfaf6] p-3 text-[0.78rem] leading-relaxed text-muted">
                  <p className="font-medium text-ink">How it works</p>
                  <p>1. On Android Chrome, tap “Write my card to a tag”.</p>
                  <p>2. Hold a blank NFC tag against the back of your phone.</p>
                  <p>3. Done. Lock the tag later if you don’t want it overwritten.</p>
                </div>

                <button
                  type="button"
                  onClick={writeTag}
                  className="btn btn-primary mt-4 w-full"
                  disabled={nfcSupported === false}
                >
                  {nfcStatus.tone === "busy" ? <Loader2 className="h-4 w-4 spin" /> : <Nfc className="h-4 w-4" />}
                  Write my card to a tag
                </button>

                {nfcSupported === false && (
                  <p className="mt-2 rounded-lg border border-[#f0d5c7] bg-[#fff7f2] px-3 py-2 text-[0.76rem] leading-relaxed text-danger">
                    {!secure
                      ? "NFC writing needs a secure (https) connection."
                      : "This browser can’t write NFC tags. Web NFC is available in Chrome on Android — on iPhone, use the QR code instead (iPhones read tags but can’t write them from a browser)."}
                  </p>
                )}

                <p
                  className={cx(
                    "mt-3 rounded-lg px-3 py-2 text-[0.78rem] leading-relaxed",
                    nfcStatus.tone === "ok" && "bg-[#f5fbe9] text-[#3f6212]",
                    nfcStatus.tone === "error" && "bg-[#fff7f2] text-danger",
                    nfcStatus.tone === "busy" && "bg-[#f7f5ee] text-muted",
                    nfcStatus.tone === "idle" && "bg-[#fbfaf6] text-muted",
                  )}
                >
                  {nfcStatus.message}
                </p>
              </div>
            ) : (
              <QrScanner onCard={(path) => router.push(path)} />
            )}
          </div>

          <div className="surface p-5">
            <h2 className="text-[0.95rem] font-semibold">Three ways to share</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                { icon: Nfc, title: "Tap", body: "Phone to tag. Instant card." },
                { icon: QrCode, title: "Scan", body: "Point a camera. No app." },
                { icon: Share2, title: "Send", body: "Link into any chat." },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-line p-3">
                  <item.icon className="h-4 w-4 text-muted" />
                  <p className="mt-2 text-[0.84rem] font-medium">{item.title}</p>
                  <p className="mt-0.5 text-[0.72rem] leading-relaxed text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QrScanner({ onCard }: { onCard: (path: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRunning(false);
  }, []);

  useEffect(() => stop, [stop]);

  async function start() {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setRunning(true);
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      const tick = () => {
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        context.drawImage(video, 0, 0, width, height);
        const image = context.getImageData(0, 0, width, height);
        const found = jsQR(image.data, width, height, { inversionAttempts: "dontInvert" });
        if (found?.data) {
          const raw = found.data.trim();
          let path: string | null = null;
          try {
            const parsed = new URL(raw, window.location.origin);
            if (parsed.origin === window.location.origin && parsed.pathname.startsWith("/c/")) {
              path = `${parsed.pathname}${parsed.search}`;
            }
          } catch {
            /* not a URL */
          }
          if (path) {
            stop();
            onCard(path);
            return;
          }
          setResult(raw);
          stop();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (caught) {
      const name = caught instanceof Error ? caught.name : "";
      setError(
        name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser settings."
          : name === "NotFoundError"
            ? "No camera found on this device."
            : "Couldn’t start the camera. Try again, or use your phone’s camera app.",
      );
      stop();
    }
  }

  return (
    <div className="p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f3f1e8]">
          <ScanLine className="h-5 w-5 text-muted" />
        </span>
        <div>
          <h2 className="text-[0.95rem] font-semibold">Scan a Tappd card</h2>
          <p className="mt-1 text-[0.82rem] leading-relaxed text-muted">
            Point your camera at someone’s QR code. If it’s a Tappd card, it opens instantly so you can
            save them or swap details.
          </p>
        </div>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-2xl border border-line bg-[#0f0f11]">
        <video
          ref={videoRef}
          playsInline
          muted
          className={cx("h-[240px] w-full object-cover", !running && "opacity-30")}
        />
        <canvas ref={canvasRef} className="hidden" />
        {!running && (
          <div className="absolute inset-0 grid place-items-center">
            <button type="button" onClick={start} className="btn btn-lime btn-sm">
              <ScanLine className="h-3.5 w-3.5" />
              Start camera
            </button>
          </div>
        )}
        {running && (
          <>
            <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-lime/70" />
            <button
              type="button"
              onClick={stop}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"
              aria-label="Stop camera"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {error && <p className="mt-3 rounded-lg bg-[#fff7f2] px-3 py-2 text-[0.78rem] text-danger">{error}</p>}
      {result && (
        <div className="mt-3 rounded-lg border border-line bg-[#fbfaf6] p-3">
          <p className="text-[0.78rem] font-medium">Scanned code</p>
          <p className="mt-1 break-all font-mono text-[0.72rem] text-muted">{result}</p>
          <a
            href={result}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline btn-sm mt-2"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open link
          </a>
        </div>
      )}
      <p className="hint mt-3">
        Camera scanning works in Chrome, Edge and Safari 16+. On iOS you can also just use the Camera app.
      </p>
    </div>
  );
}
