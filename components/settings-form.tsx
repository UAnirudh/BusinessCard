"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, LogOut, ShieldAlert, Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";

export function SettingsForm({
  initialName,
  initialEmail,
  cardSlug,
  joinedAt,
}: {
  initialName: string;
  initialEmail: string;
  cardSlug: string;
  joinedAt: string;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState({ name: initialName, email: initialEmail });
  const [profileStatus, setProfileStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [profileError, setProfileError] = useState<string | null>(null);

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [signingOut, setSigningOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileStatus("saving");
    setProfileError(null);
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setProfileError(data.error ?? "Could not save your profile.");
        setProfileStatus("error");
        return;
      }
      setProfileStatus("saved");
      router.refresh();
      window.setTimeout(() => setProfileStatus("idle"), 2200);
    } catch {
      setProfileError("Network error — try again.");
      setProfileStatus("error");
    }
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordStatus("saving");
    setPasswordError(null);
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(passwords),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setPasswordError(data.error ?? "Could not change your password.");
        setPasswordStatus("error");
        return;
      }
      setPasswords({ currentPassword: "", newPassword: "" });
      setPasswordStatus("saved");
      window.setTimeout(() => setPasswordStatus("idle"), 2200);
    } catch {
      setPasswordError("Network error — try again.");
      setPasswordStatus("error");
    }
  }

  async function signOutEverywhere() {
    setSigningOut(true);
    await fetch("/api/auth/logout-all", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agreedToDelete: true, currentPassword: deletePassword }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setDeleteError(data.error ?? "Could not delete your account.");
        setDeleting(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setDeleteError("Network error — try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="surface p-5">
        <h2 className="text-[0.95rem] font-semibold">Profile</h2>
        <p className="text-[0.78rem] text-muted">Your login details. Your public name lives on your card.</p>
        <form onSubmit={saveProfile} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="account-name" className="label">Name</label>
            <input
              id="account-name"
              className="input"
              value={profile.name}
              onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
              maxLength={80}
            />
          </div>
          <div>
            <label htmlFor="account-email" className="label">Email</label>
            <input
              id="account-email"
              className="input"
              type="email"
              value={profile.email}
              onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
              maxLength={200}
            />
          </div>
          {profileError && <p className="text-[0.78rem] text-danger sm:col-span-2">{profileError}</p>}
          <div className="sm:col-span-2 flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="hint min-w-0 break-words">Account created {joinedAt} · card at {cardSlug}</p>
            <button type="submit" className="btn btn-primary btn-sm w-full shrink-0 sm:w-auto" disabled={profileStatus === "saving"}>
              {profileStatus === "saving" ? <Loader2 className="h-3.5 w-3.5 spin" /> : <Check className="h-3.5 w-3.5" />}
              {profileStatus === "saved" ? "Saved" : "Save profile"}
            </button>
          </div>
        </form>
      </section>

      <section className="surface p-5">
        <h2 className="text-[0.95rem] font-semibold">Password</h2>
        <p className="text-[0.78rem] text-muted">
          Changing it signs out every other device. You’ll stay signed in here.
        </p>
        <form onSubmit={savePassword} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="current-password" className="label">Current password</label>
            <input
              id="current-password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={passwords.currentPassword}
              onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))}
              required
            />
          </div>
          <div>
            <label htmlFor="new-password" className="label">New password</label>
            <input
              id="new-password"
              className="input"
              type="password"
              autoComplete="new-password"
              value={passwords.newPassword}
              onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))}
              minLength={8}
              required
            />
          </div>
          {passwordError && <p className="text-[0.78rem] text-danger sm:col-span-2">{passwordError}</p>}
          <div className="sm:col-span-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={signOutEverywhere} className="btn btn-outline btn-sm w-full sm:w-auto" disabled={signingOut}>
              {signingOut ? <Loader2 className="h-3.5 w-3.5 spin" /> : <LogOut className="h-3.5 w-3.5" />}
              Sign out everywhere
            </button>
            <button type="submit" className="btn btn-primary btn-sm w-full sm:w-auto" disabled={passwordStatus === "saving"}>
              {passwordStatus === "saving" ? <Loader2 className="h-3.5 w-3.5 spin" /> : <Check className="h-3.5 w-3.5" />}
              {passwordStatus === "saved" ? "Updated" : "Update password"}
            </button>
          </div>
        </form>
      </section>

      <section className="surface border-[#f0dcd1] p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fff3ec] text-danger">
            <ShieldAlert className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[0.95rem] font-semibold">Danger zone</h2>
            <p className="mt-1 max-w-lg text-[0.78rem] leading-relaxed text-muted">
              Deleting your account removes your card, your wallet, your avatar and every session.
              Export your contacts first — this can’t be undone.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <a href="/api/export" className="btn btn-outline btn-sm w-full sm:w-auto">Export contacts</a>
          <button type="button" onClick={() => setDeleteOpen(true)} className="btn btn-danger btn-sm w-full sm:w-auto">
            <Trash2 className="h-3.5 w-3.5" />
            Delete account
          </button>
        </div>
      </section>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete your account?"
        description="This permanently removes your card, wallet and avatar. There is no undo."
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="delete-password" className="label">Confirm your password</label>
            <input
              id="delete-password"
              className="input"
              type="password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          {deleteError && <p className="text-[0.78rem] text-danger">{deleteError}</p>}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setDeleteOpen(false)} className="btn btn-ghost btn-sm w-full sm:w-auto">Keep account</button>
            <button
              type="button"
              onClick={deleteAccount}
              className="btn btn-danger btn-sm w-full sm:w-auto"
              disabled={deleting || deletePassword.length === 0}
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete forever
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
