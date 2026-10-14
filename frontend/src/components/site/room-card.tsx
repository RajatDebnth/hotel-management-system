import { ArrowUpRight, BedDouble, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { CatalogRoom } from "@/lib/api";

const tones = [
  "from-[#1D3B60] via-[#60768A] to-[#C59A52]",
  "from-[#132A46] via-[#465E79] to-[#D1B783]",
  "from-[#405066] via-[#7E8995] to-[#E3D5BA]",
];

export function RoomCard({ room, index = 0, stayQuery = "" }: { room: CatalogRoom; index?: number; stayQuery?: string }) {
  const size = room.room_size_sq_m ? `${Number(room.room_size_sq_m)} m²` : "Comfortable layout";
  const cover = room.images?.find((image) => image.is_cover) ?? room.images?.[0];
  const href = `/rooms/${room.slug}${stayQuery ? `?${stayQuery}` : ""}`;
  const available = room.available_room_count > 0;

  return (
    <article className="group overflow-hidden border border-[#D9DEE5] bg-white shadow-[0_22px_55px_-45px_rgba(19,42,70,.65)]">
      <div className={`room-art relative aspect-[4/3] overflow-hidden bg-gradient-to-br ${tones[index % tones.length]}`}>
        {cover && <Image unoptimized src={cover.url} alt={cover.alt_text || room.name} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition duration-700 group-hover:scale-[1.03]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#132A46]/55 via-transparent to-transparent" />
        <span className={`absolute left-4 top-4 border px-3 py-1.5 text-xs font-bold ${available ? "border-white/70 bg-white/95 text-[#132A46]" : "border-red-200 bg-red-50 text-red-700"}`}>
          {available ? `${room.available_room_count} available` : "No availability"}
        </span>
        <span className="absolute bottom-4 left-4 border border-white/40 bg-[#132A46]/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">{room.bed_type}</span>
      </div>
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-5">
          <div>
            <h2 className="font-heading text-3xl text-[#132A46]">{room.name}</h2>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#5F6875]">{room.description}</p>
          </div>
          <Link href={href} aria-label={`View ${room.name}`} className="grid size-11 shrink-0 place-items-center border border-[#C9D0D9] text-[#132A46] transition group-hover:border-[#132A46] group-hover:bg-[#132A46] group-hover:text-white">
            <ArrowUpRight className="size-5" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 border-y border-[#E5E8EC] py-4 text-xs font-semibold text-[#5F6875]">
          <p className="flex items-center gap-2"><Users className="size-4 text-[#A9782F]" aria-hidden="true" />Up to {room.max_guests}</p>
          <p className="flex items-center justify-end gap-2"><BedDouble className="size-4 text-[#A9782F]" aria-hidden="true" />{size}</p>
        </div>
        <div className="mt-5 flex items-end justify-between gap-4">
          <p><span className="block text-xs text-[#7A8491]">Nightly rate</span><span className="font-heading text-2xl text-[#132A46]">₹{Number(room.base_price).toLocaleString("en-IN")}</span></p>
          <Link href={href} className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#132A46] hover:text-[#A06F29]">Room details <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
        </div>
      </div>
    </article>
  );
}
