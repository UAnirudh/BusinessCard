"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ExternalLink,
  ImagePlus,
  Loader2,
  Lock,
  Plus,
  QrCode,
  Trash2,
  X,
} from "lucide-react";
import { ACCENTS } from "@/lib/site";
import { CardPreview } from "@/components/card-preview";
import { CopyButton } from "@/components/copy-button";
import { cx } from "@/lib/utils";

type EditorCard = {
  slug: string;
  displayName: string;
  headline: string;
  company: string;
  bio: string;
  location: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
  twitter: string;
  github: string;
  instagram: string;
  accent: string;
  tags: string[];
  links: { label: string; url: string }[];
  isPublic: boolean;
  collectLeads: boolean;
};

const TAG_SUGGESTIONS = [
  "design", "engineering", "product", "growth", "sales", "founder",
  "investor", "marketing", "data", "legal", "recruiting", "photography",
];

function Toggle({
  checked,
  onChange,
  label,
  description,
  icon,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-xl border border-line px-3.5 py-3 text-left transition hover:bg-[#fbfaf6]"
    >
      {icon && <span className="mt-0.5 text-muted">{icon}</span>}
      <span className="flex-1">
        <span className="block text-[0.85rem] font-medium">{label}</span>
        <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-muted">{description}</span>
      </span>
      <span
        className={cx(
          "mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition",
          checked ? "bg-ink" : "bg-[#ddd9cd]",
        )}
      >
        <span
          className={cx(
            "h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-4",
          )}
        />
      </span>
    </button>
  );
}

async function resizeToSquare(file: File, size = 480): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  context.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.86);
}

export function CardEditor({
  initial,
  initialAvatar,
  host,
}: {
  initial: EditorCard;
  initialAvatar: string | null;
  host: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<EditorCard>(initial);
  const [avatar, setAvatar] = useState<string | null>(initialAvatar);
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const initialSnapshot = useRef(JSON.stringify(initial));

  const dirty = useMemo(() => JSON.stringify(draft) !== initialSnapshot.current, [draft]);
  const publicPath = `/c/${draft.slug}`;

  function set<K extends keyof EditorCard>(key: K, value: EditorCard[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setStatus("idle");
    if (key === "slug") setFieldError(null);
  }

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-").slice(0, 30);
    if (!tag || draft.tags.includes(tag) || draft.tags.length >= 12) {
      setTagInput("");
      return;
    }
    set("tags", [...draft.tags, tag]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    set("tags", draft.tags.filter((entry) => entry !== tag));
  }

  function updateLink(index: number, patch: Partial<{ label: string; url: string }>) {
    set(
      "links",
      draft.links.map((link, i) => (i === index ? { ...link, ...patch } : link)),
    );
  }

  async function handlePhoto(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPEG, PNG or WebP image.");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await resizeToSquare(file);
      const response = await fetch("/api/card/avatar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not upload that photo.");
      } else {
        setAvatar(data.url ?? dataUrl);
        router.refresh();
      }
    } catch {
      setError("Could not process that image. Try a different one.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto() {
    setUploading(true);
    await fetch("/api/card/avatar", { method: "DELETE" });
    setAvatar(null);
    setUploading(false);
    router.refresh();
  }

  async function save() {
    if (status === "saving") return;
    setStatus("saving");
    setError(null);
    setFieldError(null);
    try {
      const response = await fetch("/api/card", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...draft,
          links: draft.links.filter((link) => link.label.trim() && link.url.trim()),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; field?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not save your card.");
        if (data.field === "slug") setFieldError(data.error ?? "Pick another address");
        setStatus("error");
        return;
      }
      initialSnapshot.current = JSON.stringify(draft);
      setStatus("saved");
      router.refresh();
      window.setTimeout(() => setStatus("idle"), 2400);
    } catch {
      setError("Network error — your changes weren’t saved.");
      setStatus("error");
    }
  }

  return (
    <div className="pb-24">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-deep" />
            Card studio
          </p>
          <h1 className="mt-2 text-[1.8rem] font-semibold tracking-[-0.035em]">My card</h1>
          <p className="mt-1 text-[0.9rem] text-muted">
            Edit the details people see on your public card.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={publicPath} target="_blank" className="btn btn-outline btn-sm">
            <ExternalLink className="h-3.5 w-3.5" />
            Open card
          </Link>
          <button type="button" onClick={save} className="btn btn-primary btn-sm" disabled={status === "saving"}>
            {status === "saving" ? <Loader2 className="h-3.5 w-3.5 spin" /> : <Check className="h-3.5 w-3.5" />}
            Save changes
          </button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {/* identity */}
          <section className="surface p-5">
            <h2 className="text-[0.95rem] font-semibold">Identity</h2>
            <p className="text-[0.78rem] text-muted">The first thing people read when your card opens.</p>

            <div className="mt-5 flex items-center gap-4">
              <div className="relative">
                <div className="h-[76px] w-[76px] overflow-hidden rounded-full border border-line bg-[#f3f1e8]">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="Your photo" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[0.68rem] text-faint">
                      No photo
                    </span>
                  )}
                </div>
                {avatar && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-line bg-white text-muted shadow-sm hover:text-danger"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn btn-outline btn-sm"
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                  {avatar ? "Replace photo" : "Upload photo"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handlePhoto(file);
                  }}
                />
                <p className="hint mt-2">Square crop, up to 1.5 MB. Your photo appears on your public card.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="displayName" className="label">Full name</label>
                <input
                  id="displayName"
                  className="input"
                  value={draft.displayName}
                  onChange={(event) => set("displayName", event.target.value)}
                  maxLength={80}
                  placeholder="Maya Chen"
                />
              </div>
              <div>
                <label htmlFor="headline" className="label">Role</label>
                <input
                  id="headline"
                  className="input"
                  value={draft.headline}
                  onChange={(event) => set("headline", event.target.value)}
                  maxLength={120}
                  placeholder="Product Designer"
                />
              </div>
              <div>
                <label htmlFor="company" className="label">Company</label>
                <input
                  id="company"
                  className="input"
                  value={draft.company}
                  onChange={(event) => set("company", event.target.value)}
                  maxLength={120}
                  placeholder="Northwind Studio"
                />
              </div>
              <div>
                <label htmlFor="location" className="label">City</label>
                <input
                  id="location"
                  className="input"
                  value={draft.location}
                  onChange={(event) => set("location", event.target.value)}
                  maxLength={120}
                  placeholder="Berlin, Germany"
                />
              </div>
              <div>
                <label htmlFor="email" className="label">Email</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  value={draft.email}
                  onChange={(event) => set("email", event.target.value)}
                  maxLength={200}
                  placeholder="you@company.com"
                />
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="bio" className="label">Short bio</label>
                  <span className="hint">{draft.bio.length}/500</span>
                </div>
                <textarea
                  id="bio"
                  className="input min-h-[92px] resize-y"
                  value={draft.bio}
                  onChange={(event) => set("bio", event.target.value)}
                  maxLength={500}
                  placeholder="What you do, who you help, and the one thing people should ask you about."
                />
              </div>
            </div>
          </section>

          {/* contact */}
          <section className="surface p-5">
            <h2 className="text-[0.95rem] font-semibold">Reach me</h2>
            <p className="text-[0.78rem] text-muted">Leave a field blank to hide it from your card.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className="label">Phone</label>
                <input
                  id="phone"
                  className="input"
                  type="tel"
                  value={draft.phone}
                  onChange={(event) => set("phone", event.target.value)}
                  maxLength={40}
                  placeholder="+49 151 2244 8890"
                />
              </div>
              <div>
                <label htmlFor="website" className="label">Website</label>
                <input
                  id="website"
                  className="input"
                  value={draft.website}
                  onChange={(event) => set("website", event.target.value)}
                  maxLength={300}
                  placeholder="northwind.studio"
                />
              </div>
              {(
                [
                  ["linkedin", "LinkedIn", "linkedin.com/in/mayachen"],
                  ["twitter", "X / Twitter", "x.com/mayachen"],
                  ["github", "GitHub", "github.com/mayachen"],
                  ["instagram", "Instagram", "instagram.com/mayachen"],
                ] as const
              ).map(([key, label, placeholder]) => (
                <div key={key}>
                  <label htmlFor={key} className="label">{label}</label>
                  <input
                    id={key}
                    className="input"
                    value={draft[key]}
                    onChange={(event) => set(key, event.target.value)}
                    maxLength={300}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* tags */}
          <section className="surface p-5">
            <h2 className="text-[0.95rem] font-semibold">Tags</h2>
            <p className="text-[0.78rem] text-muted">
              Powers “find someone in design” later. Two or three is plenty.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {draft.tags.map((tag) => (
                <span key={tag} className="chip">
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 text-faint hover:text-ink"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {draft.tags.length === 0 && <span className="hint">No tags yet.</span>}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className="input"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === ",") {
                    event.preventDefault();
                    addTag(tagInput);
                  }
                }}
                placeholder="Type a tag and press Enter"
                maxLength={30}
              />
              <button type="button" className="btn btn-outline btn-sm" onClick={() => addTag(tagInput)}>
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {TAG_SUGGESTIONS.filter((tag) => !draft.tags.includes(tag))
                .slice(0, 8)
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className="rounded-lg border border-dashed border-[#d9d5c8] px-2 py-1 text-[0.7rem] text-muted transition hover:border-ink hover:text-ink"
                  >
                    + {tag}
                  </button>
                ))}
            </div>
          </section>

          {/* links */}
          <section className="surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[0.95rem] font-semibold">Custom links</h2>
                <p className="text-[0.78rem] text-muted">Portfolio, calendar, menu, deck — anything.</p>
              </div>
              <button
                type="button"
                onClick={() => draft.links.length < 8 && set("links", [...draft.links, { label: "", url: "" }])}
                className="btn btn-outline btn-sm"
                disabled={draft.links.length >= 8}
              >
                <Plus className="h-3.5 w-3.5" />
                Add link
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {draft.links.length === 0 && <p className="hint">No custom links yet.</p>}
              {draft.links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    className="input sm:max-w-[140px]"
                    value={link.label}
                    onChange={(event) => updateLink(index, { label: event.target.value })}
                    placeholder="Label"
                    maxLength={40}
                  />
                  <input
                    className="input"
                    value={link.url}
                    onChange={(event) => updateLink(index, { url: event.target.value })}
                    placeholder="https://…"
                    maxLength={400}
                  />
                  <button
                    type="button"
                    onClick={() => set("links", draft.links.filter((_, i) => i !== index))}
                    className="btn btn-outline btn-icon shrink-0"
                    aria-label="Remove link"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* address + style */}
          <section className="surface p-5">
            <h2 className="text-[0.95rem] font-semibold">Card address & style</h2>
            <div className="mt-4">
              <label htmlFor="slug" className="label">Your link</label>
              <div className="flex items-center rounded-xl border border-line bg-white focus-within:ring-2 focus-within:ring-[#0b0b0d]/5">
                <span className="whitespace-nowrap px-3 text-[0.8rem] text-faint">{host}/c/</span>
                <input
                  id="slug"
                  className="w-full rounded-r-xl border-0 bg-transparent px-0 py-2.5 pr-3 text-[0.85rem] outline-none"
                  value={draft.slug}
                  onChange={(event) => set("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  maxLength={42}
                />
              </div>
              {fieldError ? (
                <p className="mt-1.5 text-[0.75rem] text-danger">{fieldError}</p>
              ) : (
                <p className="hint mt-1.5">Lowercase letters, numbers and dashes. Changing it breaks old links.</p>
              )}
            </div>

            <p className="label mt-5">Accent</p>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((accent) => (
                <button
                  key={accent.key}
                  type="button"
                  onClick={() => set("accent", accent.key)}
                  className={cx(
                    "flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[0.72rem] font-medium transition",
                    draft.accent === accent.key ? "border-ink bg-[#f7f5ee]" : "border-line hover:border-[#d5d1c3]",
                  )}
                >
                  <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: accent.swatch }} />
                  {accent.label}
                </button>
              ))}
            </div>
          </section>

          {/* privacy */}
          <section className="surface p-5">
            <h2 className="text-[0.95rem] font-semibold">Privacy</h2>
            <div className="mt-3 space-y-2">
              <Toggle
                checked={draft.isPublic}
                onChange={(value) => set("isPublic", value)}
                label="Public card"
                description="Anyone with your link, QR or NFC tag can open it."
                icon={<ExternalLink className="h-4 w-4" />}
              />
              <Toggle
                checked={draft.collectLeads}
                onChange={(value) => set("collectLeads", value)}
                label="Let visitors send their details"
                description="Non-members can leave a name and email so you can follow up."
                icon={<Lock className="h-4 w-4" />}
              />
            </div>
          </section>
        </div>

        {/* preview column */}
        <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <div className="flex items-center justify-between">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-faint">Live preview</p>
            <span className="chip chip-lime">{dirty ? "Unsaved" : "In sync"}</span>
          </div>
          <CardPreview
            compact
            card={{
              displayName: draft.displayName,
              headline: draft.headline || null,
              company: draft.company || null,
              location: draft.location || null,
              email: draft.email || null,
              phone: draft.phone || null,
              accent: draft.accent,
              tags: draft.tags,
              avatarUrl: avatar,
            }}
          />
          <div className="surface p-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-faint">Share</p>
            <div className="mt-2 flex gap-1.5">
              <CopyButton value={`${host}${publicPath}`} label="Copy" />
              <Link href="/app/tap" className="btn btn-outline btn-sm">
                <QrCode className="h-3.5 w-3.5" />
                QR
              </Link>
            </div>
            <p className="hint mt-2">
              Save your changes before sharing — the public card only shows saved fields.
            </p>
          </div>
        </div>
      </div>

      {(dirty || status === "error") && (
        <div className="fixed inset-x-4 bottom-[4.6rem] z-30 lg:left-auto lg:right-8 lg:w-[420px]">
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-[0_20px_40px_-24px_rgba(11,11,13,0.4)] backdrop-blur">
            <div className="min-w-0 flex-1">
              {error ? (
                <p className="truncate text-[0.8rem] text-danger">{error}</p>
              ) : (
                <p className="text-[0.8rem] font-medium">You have unsaved changes</p>
              )}
            </div>
            <button type="button" onClick={save} className="btn btn-primary btn-sm" disabled={status === "saving"}>
              {status === "saving" ? <Loader2 className="h-3.5 w-3.5 spin" /> : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
