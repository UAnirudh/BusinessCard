import { Nfc, QrCode, Search } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";

const waysToUseTappd = [
  { icon: QrCode, title: "Share your card", body: "Send a link or show your QR code." },
  { icon: Nfc, title: "Make the handoff easy", body: "Use an NFC tag when you meet in person." },
  { icon: Search, title: "Find the details later", body: "Keep a note and follow-up date with each contact." },
];

export function AuthAside() {
  return (
    <aside className="hidden overflow-hidden bg-[#f0efe9] p-10 text-ink lg:flex lg:flex-col lg:justify-between">
      <div>
        <Logo />
      </div>

      <div className="max-w-md">
        <h2 className="max-w-sm text-[2.6rem] font-semibold leading-[1.04] tracking-[-0.05em]">
          Keep notes and follow-up dates with the people you meet.
        </h2>
        <p className="mt-5 max-w-sm text-[0.95rem] leading-7 text-muted">
          Share your card by link, QR code or NFC. Add a note and a date for your next follow-up.
        </p>

        <ul className="mt-8 divide-y divide-black/10 border-y border-black/10">
          {waysToUseTappd.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4 py-4">
              <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#526b13]" />
              <span>
                <strong className="block text-sm font-semibold">{title}</strong>
                <span className="mt-1 block text-sm leading-6 text-muted">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted">
        <Link href="/" className="hover:text-ink">Back to Tappd</Link>
      </p>
    </aside>
  );
}
