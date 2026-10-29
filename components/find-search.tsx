"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, Star, Users, X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { rankConnections, type SearchableConnection } from "@/lib/search";
import { cx } from "@/lib/utils";

export type FindPerson = SearchableConnection & {
  avatarUrl: string | null;
  cardSlug: string | null;
  company: string | null;
};

const PROMPTS = [
  "designer in berlin",
  "investor in new york",
  "someone who does marketing",
  "engineer who knows react",
  "founder",
  "recruiter",
];

function highlight(text: string, terms: string[]) {
  if (!text) return text;
  const lowered = terms.map((term) => term.toLowerCase()).filter(Boolean);
  if (lowered.length === 0) return text;
  const parts = text.split(/([\s,·/]+)/);
  return parts.map((part, index) => {
    const clean = part.toLowerCase().replace(/[^a-z0-9]/g, "");
    const hit = lowered.some((term) => clean.length > 1 && (clean === term || clean.startsWith(term) || term.startsWith(clean)));
    return hit ? (
      <mark key={index} className="rounded bg-lime px-0.5 text-ink">{part}</mark>
    ) : (
      part
    );
  });
}

export function FindSearch({ people }: { people: FindPerson[] }) {
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pool = useMemo(
    () => (favoritesOnly ? people.filter((person) => person.favorite) : people),
    [people, favoritesOnly],
  );

  const results = useMemo(() => rankConnections(pool, query).slice(0, 40), [pool, query]);
  const topScore = results[0]?.score ?? 1;
  const tags = useMemo(() => {
    const map = new Map<string, number>();
    people.forEach((person) => person.tags.forEach((tag) => map.set(tag, (map.get(tag) ?? 0) + 1)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  }, [people]);

  const suggestions = useMemo(() => {
    if (results.length > 0) return [];
    if (people.length === 0) return [];
    return rankConnections(people, "").slice(0, 3);
  }, [results.length, people]);

  function usePrompt(prompt: string) {
    setQuery(prompt);
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-deep" />
            Smart search
          </p>
          <h1 className="mt-2 text-[1.8rem] font-semibold tracking-[-0.035em]">Find the right person</h1>
          <p className="mt-1 max-w-xl text-[0.9rem] leading-relaxed text-muted">
            Ask the way you’d ask a colleague. Tappd ranks roles, companies, cities, tags and your own
            notes — then tells you why each person matched.
          </p>
        </div>
        <Link href="/app/connections" className="btn btn-outline btn-sm">
          <Users className="h-3.5 w-3.5" />
          Browse wallet
        </Link>
      </header>

      <div className="surface mt-6 p-4 sm:p-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-2xl border border-line bg-[#fbfaf6] py-3.5 pl-12 pr-12 text-[0.95rem] outline-none transition focus:border-[#bdb9ab] focus:bg-white focus:ring-4 focus:ring-[#0b0b0d]/5"
            placeholder="e.g. designer in berlin, investor who does fintech…"
            aria-label="Search your contacts"
            autoFocus
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-faint hover:text-ink"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <span className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-white px-1.5 py-0.5 font-mono text-[0.62rem] text-faint sm:block">
              ⌘K
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[0.72rem] font-medium text-faint">Try</span>
          {PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => usePrompt(prompt)}
              className="rounded-full border border-line px-2.5 py-1 text-[0.72rem] text-muted transition hover:border-[#cfcbc0] hover:text-ink"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.82rem] text-muted">
          {query ? (
            <>
              <span className="font-medium text-ink">{results.length}</span>{" "}
              {results.length === 1 ? "match" : "matches"} for “{query}”
            </>
          ) : (
            <>
              <span className="font-medium text-ink">{people.length}</span> people in your wallet
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => setFavoritesOnly((value) => !value)}
          className={cx(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.74rem] font-medium transition",
            favoritesOnly
              ? "border-[#f0dfa8] bg-[#fffaea] text-ink"
              : "border-line bg-white text-muted hover:text-ink",
          )}
          aria-pressed={favoritesOnly}
        >
          <Star className="h-3.5 w-3.5" fill={favoritesOnly ? "currentColor" : "none"} />
          Favorites only
        </button>
      </div>

      {people.length === 0 ? (
        <div className="surface mt-4 flex flex-col items-center px-6 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3f1e8]">
            <Users className="h-5 w-5 text-muted" />
          </span>
          <p className="mt-3 text-[1rem] font-medium">Nothing to search yet</p>
          <p className="mt-1 max-w-sm text-[0.83rem] leading-relaxed text-muted">
            Add a contact or exchange cards to build your wallet. Search names, roles, companies,
            tags and notes whenever you need them.
          </p>
          <Link href="/app/connections?new=1" className="btn btn-primary btn-sm mt-4">Add your first contact</Link>
        </div>
      ) : results.length === 0 ? (
        <div className="surface mt-4 p-6">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted" />
            <p className="text-[0.92rem] font-medium">No one matches “{query}” yet.</p>
          </div>
          <p className="mt-1 text-[0.82rem] text-muted">
            Try fewer words, a company name, or a tag. These are the people you saved most recently:
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {suggestions.map((hit) => (
              <Link
                key={hit.item.id}
                href={`/app/connections/${hit.item.id}`}
                className="flex items-center gap-2.5 rounded-xl border border-line p-3 transition hover:border-[#d3cfc1]"
              >
                <Avatar name={hit.item.name} src={hit.item.avatarUrl} size={32} />
                <span className="min-w-0">
                  <span className="block truncate text-[0.82rem] font-medium">{hit.item.name}</span>
                  <span className="block truncate text-[0.72rem] text-muted">{hit.item.headline ?? "Contact"}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {results.map((hit, index) => {
            const person = hit.item;
            const relative = topScore > 0 ? Math.round((hit.score / topScore) * 100) : 0;
            return (
              <Link
                key={person.id}
                href={`/app/connections/${person.id}`}
                className={cx(
                  "group flex items-start gap-3.5 rounded-2xl border p-4 transition sm:items-center",
                  index === 0 && query
                    ? "border-[#d9e8a8] bg-[#fbfff0] hover:border-[#c9dd8c]"
                    : "border-line bg-white hover:border-[#d3cfc1]",
                )}
              >
                <Avatar name={person.name} src={person.avatarUrl} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[0.95rem] font-semibold tracking-[-0.01em]">
                      {highlight(person.name, hit.matchedTerms)}
                    </span>
                    {person.favorite && <Star className="h-3.5 w-3.5 text-[#c99a00]" fill="currentColor" />}
                    {index === 0 && query && <span className="chip chip-lime">Best match</span>}
                  </div>
                  <p className="mt-0.5 text-[0.8rem] text-muted">
                    {highlight(
                      [person.headline, person.company].filter(Boolean).join(" · ") || "Contact",
                      hit.matchedTerms,
                    )}
                    {person.location && <span> · {highlight(person.location, hit.matchedTerms)}</span>}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {person.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                    {query && (
                      <span className="text-[0.7rem] text-faint">
                        {hit.matches.length > 0
                          ? hit.matches.map((match) => `${match.label.toLowerCase()} “${match.term}”`).join(" · ")
                          : "matched your notes"}
                      </span>
                    )}
                  </div>
                </div>

                {query && (
                  <div className="hidden w-20 shrink-0 text-right sm:block">
                    <div className="text-[0.72rem] font-mono text-muted">{relative}%</div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#eeece3]">
                      <div
                        className={cx("h-full rounded-full", index === 0 ? "bg-ink" : "bg-[#bdb9ab]")}
                        style={{ width: `${Math.max(8, relative)}%` }}
                      />
                    </div>
                  </div>
                )}
                <ArrowUpRight className="h-4 w-4 shrink-0 text-faint transition group-hover:text-ink" />
              </Link>
            );
          })}
        </div>
      )}

      {tags.length > 0 && (
        <div className="mt-6 rounded-2xl border border-line bg-white p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-faint">Browse by tag</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map(([tag, count]) => (
              <button
                key={tag}
                type="button"
                onClick={() => setQuery(tag)}
                className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[0.74rem] text-muted transition hover:border-[#cfcbc0] hover:text-ink"
              >
                #{tag}
                <span className="text-[0.64rem] text-faint">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
