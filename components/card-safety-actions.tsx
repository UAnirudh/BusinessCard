"use client";

import { useState } from "react";

const reasons = [
  ["objectionable", "Objectionable content"],
  ["impersonation", "Impersonation"],
  ["spam", "Spam or scam"],
  ["privacy", "Personal information shared without consent"],
  ["other", "Something else"],
] as const;

export function CardSafetyActions({
  slug,
  signedIn,
  initiallyBlocked = false,
  signedInInitiallyBlocked,
}: {
  slug: string;
  signedIn: boolean;
  initiallyBlocked?: boolean;
  signedInInitiallyBlocked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number][0]>("objectionable");
  const [details, setDetails] = useState("");
  const [blocked, setBlocked] = useState(initiallyBlocked || signedInInitiallyBlocked || false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submitReport() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/card-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, reason, details }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not send the report.");
      setOpen(false);
      setDetails("");
      setMessage("Thanks. Your report has been sent for review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send the report.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlock() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/card-blocks", {
        method: blocked ? "DELETE" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not update your block list.");
      setBlocked(!blocked);
      setMessage(blocked ? "Member unblocked." : "Member blocked for your account.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update your block list.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Card safety" className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white/75">
      <p className="text-[0.78rem] font-medium text-white/85">Help keep Tappd respectful</p>
      <p className="mt-1 text-[0.72rem] leading-relaxed text-white/50">Report content that looks unsafe or misleading. Reports are saved in Tappd’s moderation queue.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="rounded-lg border border-white/15 px-3 py-2 text-[0.72rem] hover:bg-white/10" onClick={() => setOpen(!open)}>
          {open ? "Cancel report" : "Report this card"}
        </button>
        {signedIn && (
          <button type="button" className="rounded-lg border border-white/15 px-3 py-2 text-[0.72rem] hover:bg-white/10" onClick={() => void toggleBlock()} disabled={busy}>
            {blocked ? "Unblock member" : "Block member"}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3 grid gap-2">
          <label className="grid gap-1 text-[0.72rem] text-white/65">
            Reason
            <select className="rounded-lg border border-white/15 bg-[#17171c] px-3 py-2 text-sm text-white" value={reason} onChange={(event) => setReason(event.target.value as typeof reason)}>
              {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-[0.72rem] text-white/65">
            Details (optional)
            <textarea className="min-h-20 rounded-lg border border-white/15 bg-[#17171c] px-3 py-2 text-sm text-white" maxLength={1000} value={details} onChange={(event) => setDetails(event.target.value)} />
          </label>
          <button type="button" className="btn btn-lime btn-sm justify-center" onClick={() => void submitReport()} disabled={busy}>
            {busy ? "Sending…" : "Send report"}
          </button>
        </div>
      )}
      {message && <p role="status" className="mt-3 text-[0.72rem] text-lime">{message}</p>}
      {!signedIn && <p className="mt-2 text-[0.68rem] text-white/40">Sign in to block this member from your card view and exchanges.</p>}
    </section>
  );
}
