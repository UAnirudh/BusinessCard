"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Download,
  Loader2,
  Plus,
  Search,
  Star,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Modal } from "@/components/modal";
import { cx, timeAgo } from "@/lib/utils";

export type WalletPerson = {
  id: string;
  name: string;
  headline: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  tags: string[];
  notes: string | null;
  followUpDate: string | null;
  favorite: boolean;
  source: string;
  createdAt: string;
  updatedAt: string;
  avatarUrl: string | null;
  cardSlug: string | null;
};

const FILTERS = [
  { key: "all", label: "Everyone" },
  { key: "favorite", label: "Favorites" },
  { key: "exchange", label: "Swapped" },
  { key: "lead", label: "Card form" },
  { key: "manual", label: "Manual" },
  { key: "import", label: "Imported" },
] as const;

const SOURCE_LABEL: Record<string, string> = {
  exchange: "Swapped",
  lead: "Card form",
  manual: "Manual",
  import: "Imported",
};

export function ConnectionsBrowser({
  people,
  initialNew,
}: {
  people: WalletPerson[];
  initialNew: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [tag, setTag] = useState<string>("");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(initialNew);
  const [importOpen, setImportOpen] = useState(false);
  const [todayKey, setTodayKey] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    setTodayKey(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`);
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    people.forEach((person) => person.tags.forEach((entry) => set.add(entry)));
    return [...set].sort();
  }, [people]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return people
      .filter((person) => {
        const favorite = favorites[person.id] ?? person.favorite;
        if (filter === "favorite" && !favorite) return false;
        if (filter === "exchange" && person.source !== "exchange") return false;
        if (filter === "lead" && person.source !== "lead") return false;
        if (filter === "manual" && person.source !== "manual") return false;
        if (filter === "import" && person.source !== "import") return false;
        if (tag && !person.tags.includes(tag)) return false;
        if (!needle) return true;
        return [person.name, person.headline, person.company, person.location, person.email, person.notes, ...person.tags]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [people, query, filter, tag, sort, favorites]);

  async function toggleFavorite(person: WalletPerson) {
    const next = !(favorites[person.id] ?? person.favorite);
    setFavorites((current) => ({ ...current, [person.id]: next }));
    await fetch(`/api/connections/${person.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ favorite: next }),
    });
    router.refresh();
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-deep" />
            Your wallet
          </p>
          <h1 className="mt-2 text-[1.8rem] font-semibold tracking-[-0.035em]">People you’ve met</h1>
          <p className="mt-1 text-[0.9rem] text-muted">
            {people.length} {people.length === 1 ? "contact" : "contacts"} · search, tag and remember the context.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/export" className="btn btn-outline btn-sm">
            <Download className="h-3.5 w-3.5" />
            Export
          </a>
          <button type="button" onClick={() => setImportOpen(true)} className="btn btn-outline btn-sm">
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </button>
          <button type="button" onClick={() => setAddOpen(true)} className="btn btn-primary btn-sm">
            <Plus className="h-3.5 w-3.5" />
            Add contact
          </button>
        </div>
      </header>

      <div className="surface mt-6 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input pl-9"
              placeholder="Filter by name, company, tag or note…"
              aria-label="Filter contacts"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-faint hover:text-ink"
                aria-label="Clear filter"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {allTags.length > 0 && (
              <select
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                className="input !w-auto !py-2 text-[0.8rem]"
                aria-label="Filter by tag"
              >
                <option value="">All tags</option>
                {allTags.map((entry) => (
                  <option key={entry} value={entry}>#{entry}</option>
                ))}
              </select>
            )}
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as "recent" | "name")}
              className="input !w-auto !py-2 text-[0.8rem]"
              aria-label="Sort contacts"
            >
              <option value="recent">Recently updated</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>

        <div className="thin-scroll mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setFilter(entry.key)}
              className={cx(
                "rounded-full border px-3 py-1.5 text-[0.76rem] font-medium transition",
                filter === entry.key
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white text-muted hover:border-[#d3cfc1] hover:text-ink",
              )}
            >
              {entry.label}
              {entry.key === "favorite" && people.some((person) => favorites[person.id] ?? person.favorite) && (
                <span className="ml-1 text-lime">★</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="surface mt-4 flex flex-col items-center px-6 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3f1e8]">
            <Users className="h-5 w-5 text-muted" />
          </span>
          <p className="mt-3 text-[1rem] font-medium">
            {people.length === 0 ? "No contacts yet" : "Nothing matches that filter"}
          </p>
          <p className="mt-1 max-w-sm text-[0.83rem] leading-relaxed text-muted">
            {people.length === 0
              ? "Share your card, or add someone manually — every contact becomes searchable."
              : "Try a different word, tag or filter."}
          </p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setAddOpen(true)} className="btn btn-primary btn-sm">
              <UserPlus className="h-3.5 w-3.5" />
              Add contact
            </button>
            <Link href="/app/tap" className="btn btn-outline btn-sm">Share my card</Link>
          </div>
        </div>
      ) : (
        <div className="surface mt-4 overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_100px_90px_60px] gap-3 border-b border-line-soft px-5 py-2.5 text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-faint lg:grid">
            <span>Person</span>
            <span>Tags</span>
            <span>Source</span>
            <span>Updated</span>
            <span className="text-right">Save</span>
          </div>
          <ul className="divide-y divide-line-soft">
            {visible.map((person) => {
              const favorite = favorites[person.id] ?? person.favorite;
              const followUpState = person.followUpDate && todayKey
                ? person.followUpDate < todayKey ? "overdue" : person.followUpDate === todayKey ? "today" : "upcoming"
                : null;
              const followUpLabel = person.followUpDate
                ? new Date(`${person.followUpDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : null;
              return (
                <li key={person.id} className="group">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-[#fbfaf6] sm:px-5 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_100px_90px_60px]">
                    <Link href={`/app/connections/${person.id}`} className="flex min-w-0 items-center gap-3">
                      <Avatar name={person.name} src={person.avatarUrl} size={38} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[0.88rem] font-medium">{person.name}</span>
                          {person.cardSlug && (
                            <span className="hidden rounded bg-[#f1efe7] px-1 py-0.5 text-[0.58rem] font-medium text-[#6d6d63] sm:inline">
                              tappd
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-[0.76rem] text-muted">
                          {[person.headline, person.company].filter(Boolean).join(" · ") || person.email || "—"}
                        </span>
                        {followUpState && (
                          <span className={cx("mt-1 inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[0.66rem] font-semibold", followUpState === "overdue" ? "bg-[#fff2ed] text-danger" : "bg-[#f4f7e9] text-[#526523]")}>
                            {followUpState === "overdue" ? "Overdue" : followUpState === "today" ? "Follow up today" : `Follow up · ${followUpLabel}`}
                          </span>
                        )}
                        <span className="mt-0.5 flex flex-wrap gap-1 lg:hidden">
                          {person.tags.slice(0, 3).map((entry) => (
                            <span key={entry} className="tag">{entry}</span>
                          ))}
                        </span>
                      </span>
                    </Link>

                    <div className="hidden flex-wrap gap-1 lg:flex">
                      {person.tags.slice(0, 3).map((entry) => (
                        <span key={entry} className="tag">{entry}</span>
                      ))}
                      {person.tags.length === 0 && <span className="text-[0.72rem] text-faint">—</span>}
                    </div>
                    <span className="chip hidden w-fit lg:inline-flex">{SOURCE_LABEL[person.source] ?? person.source}</span>
                    <span className="hidden text-[0.72rem] text-faint lg:block">{timeAgo(person.updatedAt)}</span>

                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => toggleFavorite(person)}
                        className={cx(
                          "grid h-8 w-8 place-items-center rounded-lg transition",
                          favorite ? "text-[#c99a00]" : "text-[#cfcbc0] hover:text-ink",
                        )}
                        aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
                        aria-pressed={favorite}
                      >
                        <Star className="h-4 w-4" fill={favorite ? "currentColor" : "none"} />
                      </button>
                      <Link
                        href={`/app/connections/${person.id}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-faint transition hover:bg-white hover:text-ink"
                        aria-label={`Open ${person.name}`}
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <AddContactDialog open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => router.refresh()} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onSaved={() => router.refresh()} />
    </div>
  );
}

function AddContactDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    headline: "",
    company: "",
    email: "",
    phone: "",
    website: "",
    location: "",
    tags: "",
    notes: "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not save that contact.");
        setPending(false);
        return;
      }
      setForm({ name: "", headline: "", company: "", email: "", phone: "", website: "", location: "", tags: "", notes: "" });
      setPending(false);
      onClose();
      router.refresh();
      onSaved();
    } catch {
      setError("Network error — try again.");
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a contact"
      description="For the cards you collected before Tappd, or someone who didn’t have their phone."
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="add-name">Name</label>
            <input
              id="add-name"
              className="input"
              required
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="Daniel Roth"
              maxLength={120}
            />
          </div>
          <div>
            <label className="label" htmlFor="add-role">Role</label>
            <input
              id="add-role"
              className="input"
              value={form.headline}
              onChange={(event) => update("headline", event.target.value)}
              placeholder="Partner"
              maxLength={120}
            />
          </div>
          <div>
            <label className="label" htmlFor="add-company">Company</label>
            <input
              id="add-company"
              className="input"
              value={form.company}
              onChange={(event) => update("company", event.target.value)}
              placeholder="Meridian Capital"
              maxLength={120}
            />
          </div>
          <div>
            <label className="label" htmlFor="add-email">Email</label>
            <input
              id="add-email"
              className="input"
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              placeholder="daniel@meridian.vc"
              maxLength={200}
            />
          </div>
          <div>
            <label className="label" htmlFor="add-phone">Phone</label>
            <input
              id="add-phone"
              className="input"
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
              placeholder="+1 212 555 0148"
              maxLength={40}
            />
          </div>
          <div>
            <label className="label" htmlFor="add-location">City</label>
            <input
              id="add-location"
              className="input"
              value={form.location}
              onChange={(event) => update("location", event.target.value)}
              placeholder="New York"
              maxLength={120}
            />
          </div>
          <div>
            <label className="label" htmlFor="add-website">Website</label>
            <input
              id="add-website"
              className="input"
              value={form.website}
              onChange={(event) => update("website", event.target.value)}
              placeholder="meridian.vc"
              maxLength={300}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="add-tags">Tags</label>
            <input
              id="add-tags"
              className="input"
              value={form.tags}
              onChange={(event) => update("tags", event.target.value)}
              placeholder="investor, fintech, nyc"
              maxLength={200}
            />
            <p className="hint mt-1">Comma separated. These power the “find someone” search.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="add-notes">Notes</label>
            <textarea
              id="add-notes"
              className="input min-h-[72px] resize-y"
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              placeholder="Where you met, what you talked about, what to follow up on."
              maxLength={2000}
            />
          </div>
        </div>
        {error && <p className="text-[0.78rem] text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            {pending && <Loader2 className="h-3.5 w-3.5 spin" />}
            Save contact
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ImportDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/connections/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        imported?: number;
        skipped?: number;
      };
      if (!response.ok) {
        setError(data.error ?? "Import failed.");
        setPending(false);
        return;
      }
      setResult(`Imported ${data.imported ?? 0} contact${data.imported === 1 ? "" : "s"}${data.skipped ? ` · ${data.skipped} skipped (duplicates or empty rows)` : ""}.`);
      setCsv("");
      router.refresh();
      onSaved();
    } catch {
      setError("Network error — try again.");
    } finally {
      setPending(false);
    }
  }

  function loadFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Import contacts"
      description="Drop in a CSV from Google Contacts, Notion, Airtable or your notes. Columns: name (required), email, phone, company, role, location, website, tags, notes."
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-dashed border-line bg-[#fbfaf6] px-3 py-2.5">
          <p className="text-[0.76rem] text-muted">Have a file? Load it and check the preview.</p>
          <label className="btn btn-outline btn-sm cursor-pointer">
            <Upload className="h-3.5 w-3.5" />
            Choose CSV
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) loadFile(file);
              }}
            />
          </label>
        </div>
        <textarea
          className="input min-h-[180px] resize-y font-mono text-[0.76rem]"
          value={csv}
          onChange={(event) => setCsv(event.target.value)}
          placeholder={"name,email,company,role,tags,notes\nDaniel Roth,daniel@meridian.vc,Meridian Capital,Partner,investor;fintech,Met at Slush"}
          required
        />
        {error && <p className="text-[0.78rem] text-danger">{error}</p>}
        {result && (
          <p className="rounded-lg border border-[#d9ecc0] bg-[#f5fbe9] px-3 py-2 text-[0.78rem] text-[#3f6212]">{result}</p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Close</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending || csv.trim().length === 0}>
            {pending && <Loader2 className="h-3.5 w-3.5 spin" />}
            Import contacts
          </button>
        </div>
      </form>
    </Modal>
  );
}
