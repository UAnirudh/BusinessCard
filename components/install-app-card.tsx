"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppCard() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setIsIOS(iOS);
    setIsInstalled(standalone);

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    }
    function onInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setIsInstalled(true);
    setInstallPrompt(null);
  }

  return (
    <section className="surface p-4">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-faint">Use it like an app</p>
      <div className="mt-2 flex items-start gap-2.5">
        <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <div>
          <p className="text-[0.82rem] font-medium">{isInstalled ? "Tappd is on your home screen" : "Add Tappd to your home screen"}</p>
          {isInstalled ? (
            <p className="mt-1 text-[0.76rem] leading-relaxed text-muted">Open it directly when you’re heading out to meet people.</p>
          ) : isIOS ? (
            <p className="mt-1 text-[0.76rem] leading-relaxed text-muted">In Safari, tap Share, then “Add to Home Screen.”</p>
          ) : installPrompt ? (
            <>
              <p className="mt-1 text-[0.76rem] leading-relaxed text-muted">Launch your card, QR and wallet from one icon.</p>
              <button type="button" onClick={install} className="btn btn-outline btn-sm mt-2">
                <Download className="h-3.5 w-3.5" />
                Install Tappd
              </button>
            </>
          ) : (
            <p className="mt-1 text-[0.76rem] leading-relaxed text-muted">Open your browser menu and choose “Install app” or “Add to Home Screen.”</p>
          )}
        </div>
      </div>
    </section>
  );
}
