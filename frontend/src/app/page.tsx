import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { RoomCard } from "@/components/site/room-card";
import { PublicShell } from "@/components/site/public-shell";
import { getRooms } from "@/lib/api";
import { facilities } from "@/lib/hotel-data";

export const dynamic = "force-dynamic";

const trustPoints = [
  "Direct booking support",
  "Clear room availability",
  "Locally hosted since 1998",
] as const;

const galleryMoments = [
  ["The garden courtyard", "from-[#263D59] via-[#597183] to-[#C6A66C]", "md:col-span-2 md:row-span-2"],
  ["Quiet mornings", "from-[#9A7443] via-[#D1B783] to-[#EEE5D4]", ""],
  ["Rooms made for rest", "from-[#172F4D] via-[#506A84] to-[#AEBAC4]", ""],
] as const;

export default async function Home() {
  const catalog = await getRooms({ pageSize: 3 }).catch(() => null);

  return (
    <PublicShell>
      <section
        id="home"
        className="site-anchor relative overflow-hidden bg-[#132A46] text-white"
      >
        <div className="absolute inset-y-0 right-0 hidden w-[44%] overflow-hidden border-l border-white/10 lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1D3B60] via-[#556B7D] to-[#C59A52]" />
          <div className="absolute inset-x-[18%] bottom-0 h-[78%] rounded-t-[12rem] border border-white/25 bg-white/10" />
          <div className="absolute bottom-[9%] left-[6%] h-[40%] w-[34%] rounded-t-full bg-[#E6D3AF]/25" />
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
              <Link
                href="/rooms"
                className="inline-flex min-h-12 items-center gap-3 bg-[#C59A52] px-6 font-semibold text-[#132A46] transition hover:bg-[#D8B772]"
              >
                Book Your Stay <ArrowRight className="size-4" />
              </Link>
              <Link
                href="#hotel"
                className="inline-flex min-h-12 items-center border border-white/35 px-6 font-semibold text-white transition hover:bg-white/10"
              >
                Discover the hotel
              </Link>
            </div>
          </div>

          <div className="mt-14 grid overflow-hidden border border-white/20 bg-white/10 backdrop-blur-sm sm:grid-cols-3 lg:col-span-2 lg:max-w-4xl">
            <div className="border-b border-white/15 p-5 sm:border-r sm:border-b-0">
              <p className="flex items-center gap-2 text-xs text-white/60">
                <CalendarDays className="size-4" /> Check in
              </p>
              <p className="mt-2 font-medium">Choose your dates</p>
            </div>
            <div className="border-b border-white/15 p-5 sm:border-r sm:border-b-0">
              <p className="flex items-center gap-2 text-xs text-white/60">
                <MapPin className="size-4" /> Location
              </p>
              <p className="mt-2 font-medium">Lakeside Quarter</p>
            </div>
            <Link
              href="/rooms"
              className="flex items-center justify-between bg-[#F8F7F3] p-5 font-semibold text-[#132A46] transition hover:bg-white"
            >
              Check availability <ArrowRight className="size-5" />
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Booking assurances" className="border-b border-[#D9DEE5] bg-white">
        <div className="site-container grid gap-px bg-[#D9DEE5] sm:grid-cols-3">
          {trustPoints.map((point) => (
            <p key={point} className="flex items-center gap-3 bg-white px-5 py-5 text-sm font-semibold text-[#405066]">
              <ShieldCheck className="size-5 text-[#A9782F]" /> {point}
            </p>
          ))}
        </div>
      </section>

      <section id="hotel" className="site-anchor bg-[#F8F7F3] py-24 sm:py-30">
        <div className="site-container grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <p className="eyebrow text-[#A06F29]">Welcome to Aurelia House</p>
            <h2 className="mt-4 font-heading text-5xl leading-[1.02] text-[#132A46] sm:text-6xl">
              Heritage character, made effortless.
            </h2>
          </div>
          <div className="grid gap-5 text-lg leading-8 text-[#5F6875] sm:grid-cols-2">
            <p>We restored a historic city home with patience, preserving its generous rooms, garden light, and warm neighbourhood spirit.</p>
            <p>Today it is an intimate hotel with attentive service, excellent beds, thoughtful food, and everything needed for a calm stay.</p>
          </div>
        </div>
      </section>

      <section className="bg-white py-24 sm:py-30" aria-labelledby="featured-rooms-title">
        <div className="site-container">
          <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow text-[#A06F29]">Rest well</p>
              <h2 id="featured-rooms-title" className="mt-4 font-heading text-5xl text-[#132A46] sm:text-6xl">
                Rooms with room to breathe.
              </h2>
            </div>
            <Link href="/rooms" className="inline-flex items-center gap-2 font-semibold text-[#132A46] underline decoration-[#C59A52] decoration-2 underline-offset-8">
              View all rooms <ArrowRight className="size-4" />
            </Link>
          </div>
          {catalog?.items.length ? (
            <div className="mt-12 grid gap-7 lg:grid-cols-3">
              {catalog.items.map((room, index) => <RoomCard key={room.slug} room={room} index={index} />)}
            </div>
          ) : (
            <div className="mt-12 border border-[#D9DEE5] bg-[#F8F7F3] p-8 text-center text-[#5F6875]">
              Room details are taking a short break. Please try again soon.
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#E9EDF1] py-24" aria-labelledby="facilities-title">
        <div className="site-container">
          <div className="max-w-2xl">
            <p className="eyebrow text-[#A06F29]">Everything you need</p>
            <h2 id="facilities-title" className="mt-4 font-heading text-5xl text-[#132A46]">Comfort, considered.</h2>
          </div>
          <div className="mt-12 grid gap-px border border-[#CDD4DC] bg-[#CDD4DC] sm:grid-cols-2 lg:grid-cols-4">
            {facilities.map(({ name, description, icon: Icon }) => (
              <article key={name} className="bg-[#F8F7F3] p-7">
                <Icon className="size-6 text-[#A9782F]" />
                <h3 className="mt-8 font-heading text-2xl text-[#132A46]">{name}</h3>
                <p className="mt-3 text-sm leading-6 text-[#5F6875]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="gallery" className="site-anchor bg-[#F8F7F3] py-24 sm:py-30" aria-labelledby="gallery-title">
        <div className="site-container">
          <div className="grid gap-6 lg:grid-cols-[1fr_.7fr] lg:items-end">
            <div>
              <p className="eyebrow text-[#A06F29]">Gallery</p>
              <h2 id="gallery-title" className="mt-4 font-heading text-5xl text-[#132A46] sm:text-6xl">A closer look at the house.</h2>
            </div>
            <p className="text-lg leading-8 text-[#5F6875]">Quiet corners, considered rooms, and the garden light that gives every stay its own rhythm.</p>
          </div>
          <div className="mt-12 grid auto-rows-[220px] gap-4 md:grid-cols-4">
            {galleryMoments.map(([caption, tone, span]) => (
              <figure key={caption} className={`group relative overflow-hidden bg-gradient-to-br ${tone} ${span}`}>
                <div className="absolute inset-6 rounded-t-[7rem] border border-white/25 bg-white/5 transition-transform duration-500 group-hover:scale-105" />
                <figcaption className="absolute inset-x-6 bottom-5 text-sm font-semibold text-white drop-shadow">{caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="site-anchor bg-[#132A46] py-24 text-white" aria-labelledby="contact-title">
        <div className="site-container grid gap-14 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="eyebrow text-[#D7B571]">Contact</p>
            <h2 id="contact-title" className="mt-4 max-w-xl font-heading text-5xl leading-[1.03] sm:text-6xl">Let’s make your stay feel easy.</h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">Questions, special occasions, or local recommendations—our house team is here every day.</p>
            <Link href="/contact" className="mt-8 inline-flex min-h-12 items-center gap-3 bg-[#C59A52] px-6 font-semibold text-[#132A46]">
              Send an enquiry <ArrowRight className="size-4" />
            </Link>
          </div>
          <address className="grid gap-6 border-l border-white/15 pl-0 not-italic sm:grid-cols-2 lg:grid-cols-1 lg:pl-10">
            <p className="flex gap-4 text-white/75"><MapPin className="mt-1 size-5 shrink-0 text-[#D7B571]" /><span>14 Willow Lane<br />Lakeside Quarter</span></p>
            <p className="flex gap-4 text-white/75"><Phone className="size-5 shrink-0 text-[#D7B571]" /><span>+91 80000 12345</span></p>
            <p className="flex gap-4 text-white/75"><Mail className="size-5 shrink-0 text-[#D7B571]" /><span>stay@aureliahouse.com</span></p>
            <p className="flex gap-4 text-white/75"><Clock3 className="size-5 shrink-0 text-[#D7B571]" /><span>House team available daily<br />7:00 AM–11:00 PM</span></p>
          </address>
        </div>
      </section>

      <section className="bg-[#C59A52] py-18 text-[#132A46]">
        <div className="site-container flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow flex items-center gap-2"><Sparkles className="size-4" /> Your stay starts here</p>
            <h2 className="mt-3 font-heading text-4xl sm:text-5xl">Come away for a while.</h2>
          </div>
          <Link href="/rooms" className="inline-flex min-h-13 items-center gap-3 bg-[#132A46] px-7 font-semibold text-white">
            Book Your Stay <ArrowRight className="size-5" />
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
