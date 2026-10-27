"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, ShieldCheck } from "lucide-react";

export default function ConfirmEmailPage() {
  const [token, setToken] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "confirming" | "confirmed" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const receivedToken = url.searchParams.get("token") ?? "";
    setToken(receivedToken);
    // Keep the bearer token out of browser history and later referrer traffic.
    if (receivedToken) window.history.replaceState(null, "", url.pathname);
    setState(receivedToken ? "ready" : "error");
    if (!receivedToken) setMessage("This confirmation link is missing its token. Request a new link from Settings.");
  }, []);

  async function confirmEmail() {
    setState("confirming");
    setMessage("");
    try {
      const response = await fetch("/api/account/email-change/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        setMessage(data.error ?? "This link could not be confirmed.");
        setState("error");
        return;
      }
      setMessage(data.message ?? "Your sign-in email has been updated.");
      setState("confirmed");
    } catch {
      setMessage("Network error — reconnect and try again.");
      setState("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-5 py-12">
      <meta name="referrer" content="no-referrer" />
      <section className="surface w-full p-6 sm:p-8">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-lime/15 text-ink">
          {state === "confirmed" ? <Check className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
        </div>
        <p className="eyebrow mt-5">Account security</p>
        <h1 className="mt-2 text-[1.65rem] font-semibold tracking-[-0.035em]">
          {state === "confirmed" ? "Email confirmed" : "Confirm your new email"}
        </h1>
        <p className="mt-2 text-[0.9rem] leading-relaxed text-muted">
          {state === "confirmed"
            ? "Your new address is now your sign-in email and the contact email on your card."
            : "Confirm that you can receive mail at this address. Your account won’t change until you continue."}
        </p>
        {state === "loading" && <p role="status" className="mt-5 text-[0.82rem] text-muted">Loading confirmation…</p>}
        {message && <p role={state === "error" ? "alert" : "status"} className={`mt-5 text-[0.82rem] ${state === "error" ? "text-danger" : "text-ink"}`}>{message}</p>}
        {state === "ready" || state === "confirming" ? (
          <button type="button" onClick={confirmEmail} className="btn btn-primary mt-6 w-full justify-center" disabled={state === "confirming"}>
            {state === "confirming" ? <Loader2 className="h-4 w-4 spin" /> : <Check className="h-4 w-4" />}
            {state === "confirming" ? "Confirming…" : "Confirm email address"}
          </button>
        ) : null}
        {state === "confirmed" && <Link href="/app/settings" className="btn btn-primary mt-6 w-full justify-center">Back to settings</Link>}
        {state === "error" && <Link href="/app/settings" className="btn btn-outline mt-6 w-full justify-center">Back to settings</Link>}
      </section>
    </main>
  );
}
