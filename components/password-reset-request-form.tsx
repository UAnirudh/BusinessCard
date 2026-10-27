"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) setError(data.error ?? "Could not request a reset. Try again shortly.");
      else setMessage(data.message ?? "If an account exists for that address, reset instructions will arrive shortly.");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div>
        <label htmlFor="email" className="label">Account email</label>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required maxLength={200} value={email} onChange={(event) => setEmail(event.target.value)} className="input" placeholder="you@company.com" />
      </div>
      {error && <p role="alert" className="rounded-xl border border-[#f0d5c7] bg-[#fff7f2] px-3 py-2.5 text-[0.82rem] leading-relaxed text-danger">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-[#dce8c8] bg-[#f5f9ed] px-3 py-2.5 text-[0.82rem] leading-relaxed text-ink">{message}</p>}
      <button type="submit" className="btn btn-primary w-full !py-3" disabled={pending}>
        {pending ? <><Loader2 className="h-4 w-4 spin" /> Sending instructions…</> : <>Send reset link <ArrowRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}
