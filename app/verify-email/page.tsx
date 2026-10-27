"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, ShieldCheck } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "confirming" | "complete" | "error">("loading");
  const [message, setMessage] = useState("");
  const [returnToApp, setReturnToApp] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const receivedToken = url.searchParams.get("token") ?? "";
    const shouldReturnToApp = url.searchParams.get("returnToApp") === "1";
    setToken(receivedToken);
    setReturnToApp(shouldReturnToApp);
    // Remove the one-time bearer token from browser history and later referrers.
    if (receivedToken) window.history.replaceState(null, "", `${url.pathname}${shouldReturnToApp ? "?returnToApp=1" : ""}`);
    setState(receivedToken ? "ready" : "error");
    if (!receivedToken) setMessage("This verification link is missing its token. Sign up again to request a fresh link.");
  }, []);

  async function verifyEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state !== "ready") return;
    setState("confirming");
    setMessage("");
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? "This verification link could not be used. Request a fresh link and try again.");
        setState("error");
        return;
      }
      if (returnToApp) {
        setPassword("");
        setMessage("Your email is verified. Return to Tappd and sign in to finish setting up your card.");
        setState("complete");
        return;
      }
      router.replace("/app/card");
      router.refresh();
    } catch {
      setMessage("Could not reach Tappd. Check your connection and try again.");
      setState("ready");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl items-center px-5 py-12">
      <meta name="referrer" content="no-referrer" />
      <section className="surface w-full p-6 sm:p-8">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-lime/15 text-ink">
          {state === "error" ? <ShieldCheck className="h-5 w-5" aria-hidden="true" /> : <Check className="h-5 w-5" aria-hidden="true" />}
        </div>
        <p className="eyebrow mt-5">One last step</p>
        <h1 className="mt-2 text-[1.65rem] font-semibold tracking-[-0.035em]">Verify your email</h1>
        <p className="mt-2 text-[0.9rem] leading-relaxed text-muted">
          Confirm you can receive mail at this address, then choose the name and password for your Tappd account.
        </p>
        {state === "loading" && <p role="status" className="mt-5 text-[0.82rem] text-muted">Checking your link…</p>}
        {message && <p role="alert" className="mt-5 text-[0.82rem] text-danger">{message}</p>}
        {state === "ready" || state === "confirming" ? (
          <form onSubmit={verifyEmail} className="mt-6 space-y-4">
            <div>
              <label htmlFor="verified-name" className="label">Full name</label>
              <input id="verified-name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="input" placeholder="Maya Chen" />
            </div>
            <div>
              <label htmlFor="verified-password" className="label">Create a password</label>
              <input id="verified-password" name="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} className="input" placeholder="At least 8 characters" />
            </div>
            <p className="text-xs leading-relaxed text-faint">Your password is set only after your email verification link is accepted.</p>
            <button type="submit" className="btn btn-primary w-full justify-center" disabled={state === "confirming"}>
              {state === "confirming" ? <Loader2 className="h-4 w-4 spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              {state === "confirming" ? "Verifying…" : "Verify and create account"}
            </button>
          </form>
        ) : null}
        {state === "complete" && (
          <a href="tappd://auth/verified" className="btn btn-primary mt-6 w-full justify-center">
            Return to Tappd
          </a>
        )}
        {state === "error" && <Link href="/signup" className="btn btn-outline mt-6 w-full justify-center">Request a new verification link</Link>}
        <p className="mt-6 text-center text-xs text-faint">Need help? Visit <Link href="/support" className="font-medium underline underline-offset-2">Tappd support</Link>.</p>
      </section>
    </main>
  );
}
