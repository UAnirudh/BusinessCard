"use client";

import { useState } from "react";

type BlockedUser = { slug: string; name: string };

export function BlockedMembers({ initialUsers }: { initialUsers: BlockedUser[] }) {
  const [blockedUsers, setBlockedUsers] = useState(initialUsers);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function unblock(slug: string) {
    setBusySlug(slug);
    setError("");
    try {
      const response = await fetch("/api/card-blocks", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not unblock this member.");
      setBlockedUsers((current) => current.filter((user) => user.slug !== slug));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not unblock this member.");
    } finally {
      setBusySlug(null);
    }
  }

  return (
    <section className="surface p-4">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-faint">Blocked members</p>
      <p className="mt-1 text-[0.78rem] text-muted">Blocked cards are hidden from your account, and you can’t exchange details with those members.</p>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      {blockedUsers.length ? (
        <ul className="mt-3 divide-y divide-line">
          {blockedUsers.map((blocked) => (
            <li key={blocked.slug} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <span className="min-w-0 truncate text-sm font-medium">{blocked.name}</span>
              <button className="btn btn-outline btn-sm shrink-0" disabled={busySlug === blocked.slug} onClick={() => void unblock(blocked.slug)}>
                {busySlug === blocked.slug ? "Saving…" : "Unblock"}
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-[0.78rem] text-muted">You haven’t blocked anyone.</p>}
    </section>
  );
}
