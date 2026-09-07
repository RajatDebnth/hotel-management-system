import { Coffee, Snowflake, Tv, Wifi } from "lucide-react";
import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { PublicShell } from "@/components/site/public-shell";
import { getFacilities } from "@/lib/api";
export const metadata: Metadata = { title: "Facilities" };
export const dynamic = "force-dynamic";
const icons = { wifi: Wifi, snowflake: Snowflake, coffee: Coffee, tv: Tv };
export default async function FacilitiesPage() { const facilities = await getFacilities(); return <PublicShell><PageHero eyebrow="At your pace" title="Small luxuries, beautifully done." description="From first coffee to evening wind-down, our spaces are designed around the natural rhythm of your stay."/><section className="py-24"><div className="site-container grid gap-6 md:grid-cols-2">{facilities.map(({ id, name, description, icon }, index) => { const Icon = icons[icon as keyof typeof icons] ?? Wifi; return <article key={id} className={`min-h-72 rounded-[2rem] p-8 ${index === 0 ? "bg-[#17352d] text-white" : "bg-white"}`}><Icon className="size-7 text-[#bf9550]"/><p className="mt-16 text-xs tracking-widest opacity-60">{String(index + 1).padStart(2, "0")}</p><h2 className="mt-3 font-heading text-4xl">{name}</h2><p className="mt-4 max-w-md leading-7 opacity-65">{description}</p></article>; })}</div></section></PublicShell>; }
