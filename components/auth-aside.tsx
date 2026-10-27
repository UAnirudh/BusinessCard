import { Check, Nfc, QrCode, Search } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/avatar";

export function AuthAside() {
  return (
    <aside className="relative hidden overflow-hidden bg-ink p-10 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="grid-bg absolute inset-0 opacity-60" />
      <div className="glow -right-24 top-10 h-80 w-80 bg-lime/20" />
      <div className="glow -left-20 bottom-0 h-72 w-72 bg-[#6d4df5]/20" />

      <div className="relative">
        <Logo tone="light" />
      </div>

      <div className="relative">
        <h2 className="display max-w-sm text-[2.5rem]">
          The last business card you’ll ever print.
        </h2>
        <p className="mt-4 max-w-sm text-[0.95rem] leading-relaxed text-white/55">
          One profile for every room you walk into — and a wallet that remembers who you met and why
          they mattered.
        </p>

        <div className="mt-9 max-w-xs rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <Avatar name="Maya Chen" size={42} />
            <div>
              <p className="text-sm font-medium">Maya Chen</p>
              <p className="text-[0.72rem] text-white/45">Product Designer · Northwind</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1.5 text-center">
            {[
              { icon: Nfc, label: "NFC" },
              { icon: QrCode, label: "QR" },
              { icon: Search, label: "Search" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.03] py-2">
                <item.icon className="mx-auto h-3.5 w-3.5 text-lime" />
                <p className="mt-1 text-[0.6rem] uppercase tracking-[0.1em] text-white/35">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <ul className="mt-8 space-y-2.5 text-[0.85rem] text-white/55">
          {["Free to start, no card required", "Everyone you meet, searchable", "Export or delete anytime"].map(
            (item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-lime" />
                {item}
              </li>
            ),
          )}
        </ul>
      </div>

      <p className="relative text-xs text-white/25">
        <Link href="/" className="hover:text-white/50">← Back to Tappd</Link>
      </p>
    </aside>
  );
}
