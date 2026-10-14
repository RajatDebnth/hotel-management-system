import { ArrowLeft, Check, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicShell } from "@/components/site/public-shell";
import { getRoom } from "@/lib/api";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoom(slug).catch(() => null);
  return { title: room?.name ?? "Room" };
}

export default async function RoomDetail({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const room = await getRoom(slug).catch((error) => {
    if (String(error).includes("404")) notFound();
    throw error;
  });
  const size = room.room_size_sq_m
    ? `${Number(room.room_size_sq_m)} m²`
    : "Comfortable layout";
  const cover = room.images?.find((image) => image.is_cover) ?? room.images?.[0];

  return (
    <PublicShell>
      <section className="relative min-h-[650px] overflow-hidden bg-[#132A46] pt-32 text-white">
        {cover && <Image unoptimized src={cover.url} alt={cover.alt_text || room.name} fill priority sizes="100vw" className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#102a23]/80 via-[#102a23]/10 to-[#102a23]/10" />
        <div className="site-container relative flex min-h-[500px] flex-col justify-between pb-12">
          <Link href="/rooms" className="inline-flex w-fit items-center gap-2 text-sm">
            <ArrowLeft className="size-4" />All rooms
          </Link>
          <div>
            <p className="eyebrow text-[#f1d59e]">{room.bed_type} room</p>
            <h1 className="mt-3 font-heading text-6xl sm:text-8xl">{room.name}</h1>
            <p className="mt-5 flex items-center gap-2 text-white/75">
              <Users className="size-4" />Up to {room.max_guests} guests · {size}
            </p>
          </div>
        </div>
      </section>
      <section className="py-20">
        <div className="site-container grid gap-12 lg:grid-cols-[1.25fr_.75fr]">
          <div>
            <p className="eyebrow text-[#947039]">Your private retreat</p>
            <h2 className="mt-4 max-w-2xl font-heading text-5xl">Quiet design. Effortless comfort.</h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5d6d65]">{room.description}</p>
            <div className="mt-10 grid gap-4 border-t pt-8 sm:grid-cols-2">
              {(room.facilities ?? []).map((feature) => (
                <p key={feature.id} className="flex items-center gap-3">
                  <span className="grid size-7 place-items-center rounded-full bg-[#dfe7dd]"><Check className="size-4" /></span>
                  {feature.name}
                </p>
              ))}
            </div>
          </div>
          <aside className="h-fit rounded-3xl bg-white p-7 shadow-xl">
            <p className="text-sm text-[#6b776f]">From</p>
            <p className="mt-1 font-heading text-4xl">₹{Number(room.base_price).toLocaleString("en-IN")}<span className="text-sm font-sans text-[#6b776f]"> / night</span></p>
            <div className="my-6 border-t" />
            <p className="text-sm leading-6 text-[#6b776f]">{room.available_room_count} active rooms in this category. Availability is rechecked when you reserve.</p>
            <Link href={{ pathname: `/book/${room.slug}`, query: { check_in: query.check_in, check_out: query.check_out, guests: query.guests } }} className="mt-6 flex justify-center rounded-full bg-[#17352d] px-6 py-3.5 font-semibold text-white">Reserve this room</Link>
          </aside>
        </div>
      </section>
    </PublicShell>
  );
}
