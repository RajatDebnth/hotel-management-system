import { ArrowRight, CalendarDays, UsersRound } from "lucide-react";
import Link from "next/link";

import type { Booking } from "@/lib/api";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const date = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const statusStyles: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  confirmed: "border-blue-200 bg-blue-50 text-blue-800",
  checked_in: "border-emerald-200 bg-emerald-50 text-emerald-800",
  checked_out: "border-slate-200 bg-slate-50 text-slate-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
};

function formatDate(value: string) {
  return date.format(new Date(`${value}T00:00:00Z`));
}

export function StayCard({ booking }: { booking: Booking }) {
  return (
    <article className="border border-[#D9DEE5] bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#A06F29]">{booking.booking_reference}</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-[#132A46]">{booking.category_name}</h3>
          <p className="mt-1 text-sm text-[#5F6875]">Room {booking.room_number}</p>
        </div>
        <span className={`w-fit border px-3 py-1.5 text-xs font-bold capitalize ${statusStyles[booking.status] ?? statusStyles.checked_out}`}>
          {booking.status.replace("_", " ")}
        </span>
      </div>
      <div className="mt-5 grid gap-3 border-y border-[#E5E8EC] py-4 text-sm text-[#405066] sm:grid-cols-2">
        <p className="flex items-center gap-2"><CalendarDays className="size-4 text-[#A9782F]" aria-hidden="true" />{formatDate(booking.check_in)} – {formatDate(booking.check_out)}</p>
        <p className="flex items-center gap-2"><UsersRound className="size-4 text-[#A9782F]" aria-hidden="true" />{booking.adult_count + booking.child_count} guests · {booking.night_count} nights</p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="font-semibold text-[#132A46]">{money.format(Number(booking.total_amount))}</p>
        <Link href={`/account/bookings/${booking.booking_reference}`} className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#132A46] hover:text-[#A06F29]">
          View details <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
