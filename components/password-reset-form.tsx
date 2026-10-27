"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";

export function PasswordResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    if (password !== confirmPassword) {
      setError("Those passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) setError(data.error ?? "Could not update your password. Request a new link and try again.");
      else setComplete(true);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (complete) return (
    <div className="mt-8 space-y-4">
      <p role="status" className="rounded-xl border border-[#dce8c8] bg-[#f5f9ed] px-3 py-3 text-[0.88rem] leading-relaxed text-ink">Your password has been updated. Other devices have been signed out.</p>
      <Link href="/login" className="btn btn-primary w-full !py-3">Log in <ArrowRight className="h-4 w-4" /></Link>
    </div>
  );

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div>
        <label htmlFor="password" className="label">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} className="input" placeholder="At least 8 characters" />
      </div>
      <div>
        <label htmlFor="confirm-password" className="label">Confirm new password</label>
        <input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={200} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="input" placeholder="Enter it again" />
      </div>
      {error && <div role="alert" className="rounded-xl border border-[#f0d5c7] bg-[#fff7f2] px-3 py-2.5 text-[0.82rem] leading-relaxed text-danger">{error}<p className="mt-2"><Link className="font-semibold underline underline-offset-2" href="/forgot-password">Request a new reset link</Link></p></div>}
      <button type="submit" className="btn btn-primary w-full !py-3" disabled={pending}>
        {pending ? <><Loader2 className="h-4 w-4 spin" /> Updating password…</> : <>Update password <ArrowRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}
