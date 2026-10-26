"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, Send } from "lucide-react";

export function ExchangeForm({
  slug,
  ownerFirstName,
  signedIn,
  viewerHasCard,
  viewerName,
  viewerAccountName,
  collectLeads,
  ownerEmail,
}: {
  slug: string;
  ownerFirstName: string;
  signedIn: boolean;
  viewerHasCard: boolean;
  viewerName: string;
  viewerAccountName: string;
  collectLeads: boolean;
  ownerEmail: string | null;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [mutual, setMutual] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    if (!signedIn && !email.trim() && !phone.trim()) {
      setError("Add an email or phone number so they can follow up.");
      return;
    }
    setState("sending");
    setError(null);

    try {
      const response = await fetch("/api/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          name: signedIn ? viewerName || viewerAccountName || name : name,
          email: signedIn ? undefined : email,
          phone: signedIn ? undefined : phone,
          note,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; mutual?: boolean };
      if (!response.ok) {
        setError(data.error ?? "Could not send your details. Try again.");
        setState("idle");
        return;
      }
      setMutual(Boolean(data.mutual));
      setState("done");
    } catch {
      setError("Network error — check your connection and try again.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div role="status" aria-live="polite" className="rounded-2xl border border-[#d9ecc0] bg-[#f5fbe9] p-5 text-center">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-ink text-lime">
          <Check className="h-5 w-5" />
        </span>
        <p className="mt-3 text-[0.95rem] font-semibold">
          {mutual ? "Cards swapped." : "Details sent."}
        </p>
        <p className="mt-1 text-[0.8rem] leading-relaxed text-muted">
          {mutual
            ? `You and ${ownerFirstName} are now in each other's wallets. Find them anytime under Wallet.`
            : `${ownerFirstName} has your details and can follow up.`}
          {mutual && (
            <>
              {" "}
              <Link href="/app/connections" className="font-medium text-ink underline underline-offset-2">
                Open my wallet
              </Link>
            </>
          )}
        </p>
      </div>
    );
  }

  if (signedIn) {
    return (
      <div>
        <p className="text-[0.9rem] font-medium">Swap cards with {ownerFirstName}</p>
        <p className="mt-1 text-[0.8rem] leading-relaxed text-muted">
          {viewerHasCard
            ? "Send your card back and you’ll both land in each other’s wallets."
            : "Send your details back so they can reach you."}
        </p>
        <form onSubmit={submit} className="mt-3 space-y-2.5">
          <input
            className="input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={`Add a note — “we met at the design meetup”`}
            maxLength={500}
          />
          {error && <p className="text-[0.75rem] text-danger">{error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={state === "sending"}>
            {state === "sending" ? <Loader2 className="h-4 w-4 spin" /> : <Send className="h-4 w-4" />}
            {state === "sending" ? "Sending…" : `Send my card to ${ownerFirstName}`}
          </button>
        </form>
      </div>
    );
  }

  if (!collectLeads) {
    return (
      <div>
        <p className="text-[0.9rem] font-medium">{ownerFirstName} isn’t collecting visitor details.</p>
        <p className="mt-1 text-[0.8rem] leading-relaxed text-muted">
          Save their contact card above, or reach out directly.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ownerEmail && (
            <a href={`mailto:${ownerEmail}`} className="btn btn-primary btn-sm">
              Email {ownerFirstName}
            </a>
          )}
          <Link href="/signup" className="btn btn-outline btn-sm">
            Get your own card
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <div>
        <p className="text-[0.9rem] font-medium">Give {ownerFirstName} your details</p>
        <p className="mt-1 text-[0.78rem] leading-relaxed text-muted">
          No account needed. They’ll get this in their Tappd wallet.
        </p>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="exchange-name" className="label">Your name</label>
          <input
            id="exchange-name"
            name="name"
            autoComplete="name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Maya Chen"
            required
            maxLength={120}
          />
        </div>
        <div>
          <label htmlFor="exchange-email" className="label">Email</label>
          <input
            id="exchange-email"
            name="email"
            autoComplete="email"
            aria-describedby="exchange-contact-hint"
            className="input"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (event.target.value.trim() || phone.trim()) setError(null);
            }}
            placeholder="you@company.com"
            maxLength={200}
          />
        </div>
        <div>
          <label htmlFor="exchange-phone" className="label">Phone</label>
          <input
            id="exchange-phone"
            name="phone"
            autoComplete="tel"
            aria-describedby="exchange-contact-hint"
            className="input"
            type="tel"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              if (event.target.value.trim() || email.trim()) setError(null);
            }}
            placeholder="Optional if you add email"
            maxLength={40}
          />
        </div>
      </div>
      <p id="exchange-contact-hint" className="text-[0.72rem] text-muted">Add at least one so {ownerFirstName} can follow up.</p>
      <div>
        <label htmlFor="exchange-note" className="label">A note for {ownerFirstName} <span className="font-normal text-faint">(optional)</span></label>
        <input
          id="exchange-note"
          name="note"
          className="input"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Where did you meet?"
          maxLength={500}
        />
      </div>
      <p className="text-[0.72rem] leading-relaxed text-muted">
        Your details will be saved to {ownerFirstName}’s Tappd wallet. Read our{" "}
        <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
      </p>
      {error && <p role="alert" className="text-[0.75rem] text-danger">{error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={state === "sending"}>
        {state === "sending" ? <Loader2 className="h-4 w-4 spin" /> : <ArrowRight className="h-4 w-4" />}
        {state === "sending" ? "Sending…" : "Send my details"}
      </button>
      <p className="text-center text-[0.7rem] text-faint">
        Already on Tappd?{" "}
        <Link href={`/login?next=/c/${slug}`} className="underline underline-offset-2 hover:text-ink">
          Log in
        </Link>{" "}
        to swap cards both ways.
      </p>
    </form>
  );
}
