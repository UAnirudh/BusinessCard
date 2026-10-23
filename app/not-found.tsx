import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-6 text-white">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <Logo tone="light" />
        </div>
        <p className="mt-10 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-lime">404</p>
        <h1 className="display mt-3 text-[2.2rem]">This card isn’t here.</h1>
        <p className="mt-3 text-[0.9rem] leading-relaxed text-white/50">
          The link may have been mistyped, or the owner changed their card address. Ask them for a
          fresh tap or QR — it takes a second.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Link href="/" className="btn btn-lime btn-sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back home
          </Link>
          <Link href="/signup" className="btn btn-sm border-white/15 bg-white/5 text-white hover:bg-white/10">
            <Search className="h-3.5 w-3.5" />
            Create your card
          </Link>
        </div>
      </div>
    </main>
  );
}
