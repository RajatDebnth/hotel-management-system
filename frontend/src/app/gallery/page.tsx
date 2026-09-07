import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { PublicShell } from "@/components/site/public-shell";
const moments = [
  ["The garden at first light", "from-[#6c8068] via-[#a9ae82] to-[#e8cc8d]", "md:col-span-2 md:row-span-2"],
  ["A slow breakfast", "from-[#d2b990] via-[#9a7355] to-[#4c382f]", ""],
  ["Details with a past", "from-[#315046] via-[#738078] to-[#d1b887]", ""],
  ["Rooms made for rest", "from-[#96765c] via-[#c6ad88] to-[#ede0c7]", "md:col-span-2"],
  ["Evenings on the terrace", "from-[#192f2d] via-[#536866] to-[#c49c66]", "md:col-span-2"],
] as const;
export const metadata: Metadata = { title: "Gallery" };
export default function GalleryPage() { return <PublicShell><PageHero eyebrow="A closer look" title="Life around the house." description="Quiet mornings, generous tables, tactile rooms, and the shifting light that makes every stay feel a little different."/><section className="py-20"><div className="site-container grid auto-rows-[280px] gap-5 md:grid-cols-4">{moments.map(([caption,tone,span]) => <figure key={caption} className={`group relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${tone} ${span}`}><div className="absolute inset-6 rounded-t-[7rem] border border-white/20 bg-white/5 transition-transform duration-500 group-hover:scale-105"/><figcaption className="absolute inset-x-6 bottom-5 text-sm font-semibold text-white drop-shadow">{caption}</figcaption></figure>)}</div></section></PublicShell>; }
