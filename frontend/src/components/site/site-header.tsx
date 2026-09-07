import { Menu } from "lucide-react";
import Link from "next/link";

const navigation = [
  ["Rooms", "/rooms"],
  ["Facilities", "/facilities"],
  ["Gallery", "/gallery"],
  ["Our story", "/about"],
  ["Contact", "/contact"],
] as const;

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-40 border-b border-white/20 text-white">
      <div className="site-container flex h-20 items-center justify-between gap-6">
        <Link href="/" className="font-heading text-xl tracking-[0.14em] uppercase" aria-label="Aurelia House home">
          Aurelia <span className="text-[#dcbf85]">House</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm lg:flex" aria-label="Main navigation">
          {navigation.map(([label, href]) => <Link key={href} href={href} className="transition hover:text-[#efd49d]">{label}</Link>)}
        </nav>
        <div className="hidden items-center gap-4 sm:flex">
          <Link href="/login" className="text-sm hover:text-[#efd49d]">Sign in</Link>
          <Link href="/rooms" className="rounded-full bg-[#dcbf85] px-5 py-2.5 text-sm font-semibold text-[#183229] transition hover:bg-[#f0d9a8]">Book your stay</Link>
        </div>
        <details className="relative lg:hidden">
          <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-white/40" aria-label="Open navigation"><Menu className="size-5" /></summary>
          <nav className="absolute right-0 mt-3 w-56 rounded-2xl bg-[#17352d] p-3 shadow-2xl" aria-label="Mobile navigation">
            {navigation.map(([label, href]) => <Link key={href} href={href} className="block rounded-xl px-4 py-3 text-sm hover:bg-white/10">{label}</Link>)}
            <Link href="/login" className="mt-2 block rounded-xl bg-[#dcbf85] px-4 py-3 text-center font-semibold text-[#17352d]">Sign in</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
