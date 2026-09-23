import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CancelBooking } from "@/components/account/cancel-booking";
import { getBooking } from "@/lib/api";
import { getSessionCookieHeader } from "@/lib/auth/session";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export default async function BookingDetail({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const cookie = await getSessionCookieHeader();
  if (!cookie) redirect(`/login?next=/account/bookings/${encodeURIComponent(reference)}`);
  const booking = await getBooking(reference, { cookie }).catch((error) => {
    if (String(error).includes("not found")) notFound();
    throw error;
  });
  const cancellable = ["pending", "confirmed"].includes(booking.status) && booking.check_in > new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-14">
      <Link href="/account" className="text-sm font-semibold">← Back to account</Link>
      <article className="mt-7 rounded-3xl bg-white p-6 shadow-sm sm:p-10">
        <div className="flex flex-col gap-4 border-b pb-7 sm:flex-row sm:items-start sm:justify-between"><div><p className="eyebrow text-[#947039]">Booking {booking.booking_reference}</p><h1 className="mt-3 font-heading text-5xl">{booking.category_name}</h1><p className="mt-2 text-[#5d6d65]">Room {booking.room_number}</p></div><span className="w-fit rounded-full bg-[#dfe7dd] px-4 py-2 text-sm font-bold capitalize">{booking.status.replace("_", " ")}</span></div>
        <dl className="grid gap-6 py-8 sm:grid-cols-2">
          <Item term="Stay" value={`${booking.check_in} → ${booking.check_out}`} />
          <Item term="Guests" value={`${booking.adult_count} adults, ${booking.child_count} children`} />
          <Item term="Guest" value={`${booking.guest_name} · ${booking.guest_email}`} />
          <Item term="Phone" value={booking.guest_phone} />
          <Item term="Price" value={`${money.format(Number(booking.price_per_night))} × ${booking.night_count} nights`} />
          <Item term="Total" value={money.format(Number(booking.total_amount))} />
        </dl>
        {booking.special_requests && <div className="rounded-2xl bg-[#f6f2e9] p-5"><p className="text-sm font-bold">Special requests</p><p className="mt-2 text-[#5d6d65]">{booking.special_requests}</p></div>}
        {cancellable ? <div className="mt-8"><CancelBooking reference={booking.booking_reference} /></div> : <p className="mt-8 text-sm text-[#5d6d65]">This reservation can no longer be cancelled online.</p>}
      </article>
    </main>
  );
}

function Item({ term, value }: { term: string; value: string }) {
  return <div><dt className="text-xs font-bold uppercase tracking-wider text-[#7d8a82]">{term}</dt><dd className="mt-2 font-semibold">{value}</dd></div>;
}
