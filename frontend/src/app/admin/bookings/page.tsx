import { redirect } from "next/navigation";

import { BookingManager } from "@/components/admin/booking-manager";
import { getAdminBookings } from "@/lib/api";
import { getSessionCookieHeader } from "@/lib/auth/session";

type Search = { booking_page?: string; booking_q?: string; booking_status?: string };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const query = await searchParams;
  const cookie = await getSessionCookieHeader();
  if (!cookie) redirect("/login?next=/admin/bookings");
  const bookings = await getAdminBookings(
    { page: Number(query.booking_page) || 1, query: query.booking_q, status: query.booking_status },
    { cookie },
  );

  return (
    <main className="admin-page">
      <header className="border-b border-neutral-300 pb-7">
        <p className="admin-kicker">Front desk</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Bookings</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-500">Review reservations and manage every stay through its approved status workflow.</p>
      </header>
      <div className="mt-8"><BookingManager bookings={bookings} /></div>
    </main>
  );
}
