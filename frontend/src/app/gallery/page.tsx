import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/site/page-hero";
import { PublicShell } from "@/components/site/public-shell";
import { getHotelPhotographs } from "@/lib/hotel-images";

export const metadata: Metadata = { title: "Gallery" };
export default function GalleryPage() {
  const photographs = getHotelPhotographs();
  return <PublicShell><PageHero eyebrow="A closer look" title="Life around the house." description="See the rooms guests can choose from, with real photographs of each available category."/><section className="bg-[#F8F7F3] py-20"><div className="site-container grid auto-rows-[280px] gap-5 md:grid-cols-4">{photographs.map((photograph, index) => <figure key={photograph.file} className={`group relative overflow-hidden ${index === 0 ? "md:col-span-2 md:row-span-2" : "md:col-span-2"}`}><Image unoptimized src={photograph.src} alt={photograph.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"/><div className="absolute inset-0 bg-gradient-to-t from-[#132A46]/75 via-transparent to-transparent"/><figcaption className="absolute inset-x-6 bottom-5 text-sm font-semibold text-white drop-shadow">{photograph.caption}</figcaption></figure>)}</div></section></PublicShell>;
}
