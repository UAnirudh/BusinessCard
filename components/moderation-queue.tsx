"use client";

import { useState } from "react";

type Report = {
  id: string;
  cardSlug: string;
  cardName: string;
  cardOwnerEmail: string;
  reason: string;
  details: string | null;
  createdAt: string;
};

export function ModerationQueue({ initialReports }: { initialReports: Report[] }) {
  const [reports, setReports] = useState(initialReports);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function decide(reportId: string, action: "dismiss" | "hide_card" | "suspend_user") {
    setBusyId(reportId);
    setError("");
    try {
      const response = await fetch("/api/moderation/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reportId, action }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not update this report.");
      setReports((current) => current.filter((report) => report.id !== reportId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update this report.");
    } finally {
      setBusyId(null);
    }
  }

  if (reports.length === 0) return <p className="surface mt-6 p-5 text-sm text-muted">No open card reports.</p>;

  return (
    <div className="mt-6 grid gap-3">
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {reports.map((report) => (
        <article key={report.id} className="surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{report.reason.replaceAll("_", " ")}</h2>
              <p className="mt-1 text-sm text-muted">
                <a className="underline underline-offset-2" href={`/c/${encodeURIComponent(report.cardSlug)}`} target="_blank" rel="noreferrer">{report.cardName}</a>
                {" · "}{report.cardOwnerEmail}
              </p>
            </div>
            <time className="text-xs text-faint" dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString()}</time>
          </div>
          {report.details && <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-white/70 p-3 text-sm text-ink">{report.details}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-outline btn-sm" disabled={busyId === report.id} onClick={() => void decide(report.id, "dismiss")}>Dismiss report</button>
            <button className="btn btn-outline btn-sm" disabled={busyId === report.id} onClick={() => void decide(report.id, "hide_card")}>Hide card</button>
            <button className="btn btn-outline btn-sm border-red-300 text-red-800 hover:bg-red-50" disabled={busyId === report.id} onClick={() => void decide(report.id, "suspend_user")}>Suspend account</button>
          </div>
        </article>
      ))}
    </div>
  );
}
