"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CreditCard,
  LayoutDashboard,
  Loader2,
  LogOut,
  Nfc,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/avatar";
import { cx } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/app/card", label: "My card", icon: CreditCard },
  { href: "/app/connections", label: "Wallet", icon: Users },
  { href: "/app/find", label: "Find someone", icon: Search },
  { href: "/app/tap", label: "Tap & share", icon: Nfc },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

const MOBILE_NAV = [NAV[0], NAV[1], NAV[2], NAV[3], NAV[4]];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  name,
  email,
  avatar,
}: {
  name: string;
  email: string;
  avatar: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function logout() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-[#fbfaf7] px-4 py-6 lg:flex">
      <div className="px-2">
        <Logo />
      </div>

      <nav className="mt-8 flex-1 space-y-1">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.88rem] font-medium transition",
                active
                  ? "bg-ink text-white shadow-[0_10px_20px_-16px_rgba(11,11,13,0.9)]"
                  : "text-[#55554f] hover:bg-[#f0eee6] hover:text-ink",
              )}
            >
              <item.icon className={cx("h-4 w-4", active ? "text-lime" : "text-[#8a8a80]")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-2xl border border-line bg-white p-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={name} src={avatar} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.82rem] font-medium leading-tight">{name}</p>
            <p className="truncate text-[0.68rem] text-faint">{email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          disabled={signingOut}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line py-1.5 text-[0.72rem] font-medium text-muted transition hover:border-[#d9d5c9] hover:text-ink disabled:opacity-60"
        >
          {signingOut ? <Loader2 className="h-3 w-3 spin" /> : <LogOut className="h-3 w-3" />}
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function MobileHeader({ name, avatar }: { name: string; avatar: string | null }) {
  return (
    <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b border-line bg-paper/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
      <Logo />
      <Link href="/app/settings" aria-label="Settings" className="grid min-h-11 min-w-11 place-items-center">
        <Avatar name={name} src={avatar} size={30} />
      </Link>
    </header>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="flex items-stretch justify-around">
        {MOBILE_NAV.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.68rem] font-medium transition",
                active ? "text-ink" : "text-faint",
              )}
            >
              <item.icon className={cx("h-5 w-5", active && "text-ink")} strokeWidth={active ? 2.2 : 1.8} />
              {item.label === "Find someone" ? "Find" : item.label === "Tap & share" ? "Tap" : item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
