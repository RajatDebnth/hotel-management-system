import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-[#0D2037] text-[#F8F7F3]">
      <div className="site-container grid gap-10 py-14 md:grid-cols-[1.3fr_1fr_1fr]">
        <div><p className="font-heading text-2xl tracking-[0.14em] uppercase">Aurelia <span className="text-[#D7B571]">House</span></p><p className="mt-4 max-w-sm text-sm leading-6 text-white/65">A quiet city hotel where heritage rooms, thoughtful comfort, and generous hospitality meet.</p></div>
        <div><p className="text-xs font-bold tracking-[0.18em] text-[#D7B571] uppercase">Navigate</p><div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white/75"><Link href="/#home">Home</Link><Link href="/#gallery">Gallery</Link><Link href="/#contact">Contact</Link><Link href="/login">Sign in</Link><Link href="/rooms" className="col-span-2 text-[#D7B571]">Book Your Stay</Link></div></div>
        <div className="space-y-3 text-sm text-white/70"><p className="text-xs font-bold tracking-[0.18em] text-[#D7B571] uppercase">Find us</p><p className="flex gap-3"><MapPin className="mt-0.5 size-4 shrink-0" />14 Willow Lane, Lakeside Quarter</p><p className="flex gap-3"><Phone className="size-4" />+91 80000 12345</p><p className="flex gap-3"><Mail className="size-4" />stay@aureliahouse.com</p></div>
      </div>
      <div className="border-t border-white/10"><div className="site-container flex flex-col gap-2 py-5 text-xs text-white/45 sm:flex-row sm:justify-between"><p>© 2026 Aurelia House. All rights reserved.</p><p>Thoughtful stays, made personal.</p></div></div>
    </footer>
  );
}
