"use client";

import { useEffect } from "react";

export function ViewTracker({ slug, source }: { slug: string; source: string }) {
  useEffect(() => {
    const key = `tappd:view:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage disabled */
    }
    fetch("/api/views", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, source }),
      keepalive: true,
    }).catch(() => undefined);
  }, [slug, source]);

  return null;
}
