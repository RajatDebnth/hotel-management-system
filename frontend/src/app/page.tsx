import {
  ArrowRight,
  Coffee,
  Dumbbell,
  Sparkles,
  Snowflake,
  Tv,
  Utensils,
  Wifi,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { HeroAvailabilityForm } from "@/components/site/hero-availability-form";
import { PublicShell } from "@/components/site/public-shell";
import { getFacilities } from "@/lib/api";
import { getHotelPhotographs } from "@/lib/hotel-images";
import { facilities as fallbackFacilities } from "@/lib/hotel-data";

export const dynamic = "force-dynamic";

const facilityIcons = {
  wifi: Wifi,
  snowflake: Snowflake,
  coffee: Coffee,
  tv: Tv,
  gym: Dumbbell,
  restaurant: Utensils,
};

export default async function Home() {
  const liveFacilities = await getFacilities().catch(() => null);
  const displayedFacilities = liveFacilities?.length
    ? liveFacilities.slice(0, 4).map((facility) => ({
        ...facility,
        icon: facilityIcons[facility.icon as keyof typeof facilityIcons] ?? Sparkles,
      }))
    : fallbackFacilities;
  const [heroPhotograph, aboutPhotograph] = getHotelPhotographs();

  return (
    <PublicShell>
      <section id="home" className="site-anchor relative overflow-hidden bg-[#132A46] text-white">
        <div className="absolute inset-y-0 right-0 hidden w-[44%] overflow-hidden border-l border-white/10 lg:block">
          <Image unoptimized src={heroPhotograph.src} alt={heroPhotograph.alt} fill priority sizes="44vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#132A46]/65 via-[#132A46]/15 to-transparent" />
        </div>

        <div className="site-container relative z-10 grid min-h-[690px] items-end pb-14 pt-20 lg:grid-cols-[1.12fr_.88fr] lg:pb-20">
          <div className="max-w-3xl">
            <p className="eyebrow text-[#D7B571]">Aurelia House · Lakeside Quarter</p>
            <h1 className="mt-5 max-w-3xl font-heading text-6xl leading-[0.94] tracking-[-0.04em] sm:text-7xl lg:text-[6.8rem]">
              Stay somewhere with a story.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/75">
              A quiet city hotel shaped by heritage rooms, thoughtful service, and the simple pleasure of slowing down.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/rooms" className="inline-flex min-h-12 items-center gap-3 bg-[#C59A52] px-6 font-semibold text-[#132A46] transition hover:bg-[#D8B772]">
                Book Your Stay <ArrowRight className="size-4" />
              </Link>
              <Link href="#hotel" className="inline-flex min-h-12 items-center border border-white/35 px-6 font-semibold text-white transition hover:bg-white/10">
                Discover the hotel
              </Link>
            </div>
          </div>

          <HeroAvailabilityForm />
        </div>
      </section>

      <section id="hotel" className="site-anchor bg-[#F8F7F3] py-24 sm:py-30" aria-labelledby="about-title">
        <div className="site-container">
          <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div className="relative min-h-[430px] overflow-hidden">
              <Image unoptimized src={aboutPhotograph.src} alt={aboutPhotograph.alt} fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#132A46]/45 via-transparent to-transparent" />
            </div>
            <div>
              <p className="eyebrow text-[#A06F29]">About Aurelia House</p>
              <h2 id="about-title" className="mt-4 font-heading text-5xl leading-[1.02] text-[#132A46] sm:text-6xl">Heritage character, made effortless.</h2>
              <div className="mt-7 grid gap-5 text-base leading-8 text-[#5F6875] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <p>Aurelia House is a small independent hotel built around generous rooms, garden light, and the warm rhythm of its lakeside neighbourhood.</p>
                <p>Guests receive direct help from the house team, transparent room rates, and a booking request they can follow from submission to confirmation.</p>
              </div>
            </div>
          </div>

          <div className="mt-20 border-t border-[#D9DEE5] pt-12">
            <div className="max-w-2xl">
              <p className="eyebrow text-[#A06F29]">Facilities</p>
              <h3 className="mt-4 font-heading text-4xl text-[#132A46] sm:text-5xl">Comfort, considered.</h3>
              <p className="mt-4 text-[#5F6875]">The essentials are handled with care, leaving you free to settle in and enjoy the house at your own pace.</p>
            </div>
            <div className="mt-10 grid gap-px border border-[#CDD4DC] bg-[#CDD4DC] sm:grid-cols-2 lg:grid-cols-4">
              {displayedFacilities.map(({ name, description, icon: Icon }) => (
                <article key={name} className="bg-white p-7">
                  <Icon className="size-6 text-[#A9782F]" aria-hidden="true" />
                  <h4 className="mt-8 font-heading text-2xl text-[#132A46]">{name}</h4>
                  <p className="mt-3 text-sm leading-6 text-[#5F6875]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#C59A52] py-18 text-[#132A46]" aria-labelledby="home-cta-title">
        <div className="site-container flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow flex items-center gap-2"><Sparkles className="size-4" aria-hidden="true" /> Your stay starts here</p>
            <h2 id="home-cta-title" className="mt-3 font-heading text-4xl sm:text-5xl">Come away for a while.</h2>
          </div>
          <Link href="/rooms" className="inline-flex min-h-13 items-center gap-3 bg-[#132A46] px-7 font-semibold text-white">
            Book Your Stay <ArrowRight className="size-5" />
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
