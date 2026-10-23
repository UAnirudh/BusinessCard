"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Download,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Star,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Modal } from "@/components/modal";
import { cx, longDate, normalizeUrl, prettyUrl, timeAgo } from "@/lib/utils";

export type ConnectionRecord = {
  id: string;
  name: string;
  headline: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  location: string | null;
  bio: string | null;
  notes: string | null;
  tags: string[];
  favorite: boolean;
  source: string;
  metAt: string | null;
  createdAt: string;
  updatedAt: string;
  cardSlug: string | null;
  avatarUrl: string | null;
};

const SOURCE_LABEL: Record<string, string> = {
  exchange: "Swapped cards",
  lead: "Left their details on your card",
  manual: "Added manually",
  import: "Imported",
};

export function ConnectionDetail({ person }: { person: ConnectionRecord }) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(person.favorite);
  const [notes, setNotes] = useState(person.notes ?? "");
  const [savedNotes, setSavedNotes] = useState(person.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: person.name,
    headline: person.headline ?? "",
    company: person.company ?? "",
    email: person.email ?? "",
    phone: person.phone ?? "",
    website: person.website ?? "",
    location: person.location ?? "",
    tags: person.tags.join(", "),
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function patch(payload: Record<string, unknown>) {
    const response = await fetch(`/api/connections/${person.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "Could not save changes.");
    }
  }

  async function toggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    try {
      await patch({ favorite: next });
      router.refresh();
    } catch {
      setFavorite(!next);
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    setError(null);
    try {
      await patch({ notes });
      setSavedNotes(notes);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save notes.");
    } finally {
      setSavingNotes(false);
    }
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingEdit(true);
    setError(null);
    try {
      await patch({
        ...draft,
        tags: draft.tags.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean),
      });
      setEditing(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save changes.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function remove() {
    const response = await fetch(`/api/connections/${person.id}`, { method: "DELETE" });
    if (response.ok) {
      router.push("/app/connections");
      router.refresh();
    }
  }

  const details = [
    { icon: Mail, label: "Email", value: person.email, href: person.email ? `mailto:${person.email}` : null },
    { icon: Phone, label: "Phone", value: person.phone, href: person.phone ? `tel:${person.phone.replace(/\s+/g, "")}` : null },
    { icon: Globe, label: "Website", value: prettyUrl(person.website), href: normalizeUrl(person.website) },
    {
      icon: MapPin,
      label: "Location",
      value: person.location,
      href: person.location ? `https://maps.google.com/?q=${encodeURIComponent(person.location)}` : null,
    },
  ].filter((row) => Boolean(row.value));

  return (
    <div>
      <Link href="/app/connections" className="inline-flex items-center gap-1.5 text-[0.8rem] text-muted transition hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to wallet
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={person.name} src={person.avatarUrl} size={64} />
          <div className="min-w-0">
            <h1 className="truncate text-[1.7rem] font-semibold leading-tight tracking-[-0.03em]">{person.name}</h1>
            <p className="mt-0.5 truncate text-[0.9rem] text-muted">
              {[person.headline, person.company].filter(Boolean).join(" · ") || "No role saved yet"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="chip">{SOURCE_LABEL[person.source] ?? person.source}</span>
              {person.metAt && (
                <span className="chip">
                  <CalendarDays className="h-3 w-3" /> met {longDate(person.metAt)}
                </span>
              )}
              <span className="chip">updated {timeAgo(person.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={toggleFavorite}
            className={cx("btn btn-outline btn-sm", favorite && "!border-[#f0dfa8] !bg-[#fffaea]")}
            aria-pressed={favorite}
          >
            <Star className="h-3.5 w-3.5" fill={favorite ? "currentColor" : "none"} />
            {favorite ? "Favorite" : "Favorite"}
          </button>
          <a href={`/api/connections/${person.id}/vcard`} className="btn btn-outline btn-sm">
            <Download className="h-3.5 w-3.5" />
            Save contact
          </a>
          <button type="button" onClick={() => setEditing((value) => !value)} className="btn btn-primary btn-sm">
            {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            {editing ? "Cancel edit" : "Edit"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-[#f0d5c7] bg-[#fff7f2] px-3 py-2 text-[0.8rem] text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {editing ? (
            <form onSubmit={saveEdit} className="surface p-5">
              <h2 className="text-[0.95rem] font-semibold">Edit details</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["name", "Name"],
                    ["headline", "Role"],
                    ["company", "Company"],
                    ["email", "Email"],
                    ["phone", "Phone"],
                    ["website", "Website"],
                    ["location", "Location"],
                    ["tags", "Tags (comma separated)"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className={key === "name" ? "sm:col-span-2" : undefined}>
                    <label className="label" htmlFor={`edit-${key}`}>{label}</label>
                    <input
                      id={`edit-${key}`}
                      className="input"
                      value={draft[key]}
                      onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                      maxLength={key === "tags" ? 300 : 300}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingEdit}>
                  {savingEdit ? <Loader2 className="h-3.5 w-3.5 spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save changes
                </button>
              </div>
            </form>
          ) : (
            <div className="surface overflow-hidden">
              <div className="flex items-center justify-between border-b border-line-soft px-5 py-3.5">
                <h2 className="text-[0.95rem] font-semibold">Contact details</h2>
                {person.cardSlug && (
                  <Link
                    href={`/c/${person.cardSlug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[0.76rem] font-medium text-muted hover:text-ink"
                  >
                    Their Tappd card
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
              {details.length === 0 ? (
                <p className="px-5 py-6 text-[0.82rem] text-muted">
                  No contact details yet. Use Edit to add an email or phone number.
                </p>
              ) : (
                <ul className="divide-y divide-line-soft">
                  {details.map((row) => (
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
                          <span className="block text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-faint">
                            {row.label}
                          </span>
                          <span className="block truncate text-[0.86rem] font-medium">{row.value}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center gap-1.5 border-t border-line-soft px-5 py-3">
                <Tag className="h-3.5 w-3.5 text-faint" />
                {person.tags.length > 0 ? (
                  person.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)
                ) : (
                  <span className="text-[0.75rem] text-faint">No tags — add a few to make them findable.</span>
                )}
              </div>
            </div>
          )}

          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[0.95rem] font-semibold">Notes</h2>
                <p className="text-[0.78rem] text-muted">Context beats memory. Write it down while it’s fresh.</p>
              </div>
              {notes !== savedNotes && <span className="chip chip-lime">Unsaved</span>}
            </div>
            <textarea
              className="input mt-3 min-h-[140px] resize-y"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Met at the design meetup. Looking for a co-founder. Follow up about the Berlin project in June."
              maxLength={2000}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="hint">{notes.length}/2000</span>
              <button
                type="button"
                onClick={saveNotes}
                className="btn btn-primary btn-sm"
                disabled={savingNotes || notes === savedNotes}
              >
                {savingNotes ? <Loader2 className="h-3.5 w-3.5 spin" /> : <Check className="h-3.5 w-3.5" />}
                Save note
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface p-5">
            <h2 className="text-[0.95rem] font-semibold">Snapshot</h2>
            <dl className="mt-3 space-y-2.5 text-[0.82rem]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">How they joined</dt>
                <dd className="text-right font-medium">{SOURCE_LABEL[person.source] ?? person.source}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">First saved</dt>
                <dd className="text-right font-medium">{longDate(person.createdAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Last met</dt>
                <dd className="text-right font-medium">{person.metAt ? longDate(person.metAt) : "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Last updated</dt>
                <dd className="text-right font-medium">{timeAgo(person.updatedAt)}</dd>
              </div>
            </dl>
            {person.bio && (
              <p className="mt-4 border-t border-line-soft pt-3 text-[0.82rem] leading-relaxed text-muted">{person.bio}</p>
            )}
          </div>

          <div className="surface p-5">
            <h2 className="text-[0.95rem] font-semibold">Reach out</h2>
            <div className="mt-3 grid gap-2">
              {person.email ? (
                <a href={`mailto:${person.email}`} className="btn btn-outline w-full justify-start !rounded-xl">
                  <Mail className="h-4 w-4 text-muted" />
                  Email {person.name.split(" ")[0]}
                </a>
              ) : (
                <p className="text-[0.8rem] text-muted">No email saved yet.</p>
              )}
              {person.phone && (
                <a href={`tel:${person.phone.replace(/\s+/g, "")}`} className="btn btn-outline w-full justify-start !rounded-xl">
                  <Phone className="h-4 w-4 text-muted" />
                  Call {person.phone}
                </a>
              )}
              {person.website && (
                <a
                  href={normalizeUrl(person.website) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline w-full justify-start !rounded-xl"
                >
                  <Globe className="h-4 w-4 text-muted" />
                  {prettyUrl(person.website)}
                </a>
              )}
            </div>
          </div>

          <div className="surface border-[#f0dcd1] p-5">
            <h2 className="text-[0.9rem] font-semibold text-danger">Remove contact</h2>
            <p className="mt-1 text-[0.78rem] leading-relaxed text-muted">
              This deletes them from your wallet. It does not delete their own card.
            </p>
            <button type="button" onClick={() => setConfirmDelete(true)} className="btn btn-danger btn-sm mt-3">
              <Trash2 className="h-3.5 w-3.5" />
              Remove from wallet
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Remove this contact?"
        description={`${person.name} will be removed from your wallet. You can’t undo this — but if you swap cards again, they’ll reappear.`}
      >
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setConfirmDelete(false)} className="btn btn-ghost btn-sm">Keep contact</button>
          <button type="button" onClick={remove} className="btn btn-danger btn-sm">
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </Modal>
    </div>
  );
}
