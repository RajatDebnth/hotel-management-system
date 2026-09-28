import Link from "next/link";
import { redirect } from "next/navigation";

import { StayCard } from "@/components/account/stay-card";
import type { Booking } from "@/lib/api";
import { getBookings } from "@/lib/api";
import { groupStays } from "@/lib/account/bookings";
import { getSessionCookieHeader } from "@/lib/auth/session";

export default async function StaysPage() {
  const cookie = await getSessionCookieHeader();
  if (!cookie) redirect("/login?next=/account/stays");
  const bookings = await getBookings({ cookie });
  const groups = groupStays(bookings.items);

  return (
    <main>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A06F29]">Stay history</p>
          <h1 className="mt-2 font-heading text-4xl sm:text-5xl">Previous stays</h1>
          <p className="mt-3 text-[#5F6875]">Track requests, current visits, completed stays, and cancellations.</p>
        </div>
        <Link href="/rooms" className="inline-flex min-h-11 w-fit items-center bg-[#132A46] px-5 text-sm font-semibold text-white">Book another stay</Link>
      </div>

      {bookings.items.length === 0 ? (
        <section className="mt-8 border border-dashed border-[#C9D0D9] bg-white p-8">
          <h2 className="text-xl font-semibold">No reservations yet</h2>
          <p className="mt-2 text-sm text-[#5F6875]">Explore the rooms when you are ready for a quiet escape.</p>
        </section>
      ) : (
        <div className="mt-8 grid gap-9">
          <StayGroup title="In-house now" description="Stays currently checked in." items={groups.active} />
          <StayGroup title="Upcoming stays" description="Pending requests and confirmed future reservations." items={groups.upcoming} />
          <StayGroup title="Past & cancelled" description="Completed, cancelled, rejected, or expired reservations." items={groups.past} />
        </div>
      )}
    </main>
  );
}

function StayGroup({ title, description, items }: { title: string; description: string; items: Booking[] }) {
  const id = `group-${title.replaceAll(" ", "-").toLowerCase()}`;
  return (
    <section aria-labelledby={id}>
      <div className="flex items-end justify-between gap-4 border-b border-[#C9D0D9] pb-3">
        <div><h2 id={id} className="text-2xl font-semibold">{title}</h2><p className="mt-1 text-sm text-[#5F6875]">{description}</p></div>
        <span className="grid min-w-9 place-items-center border border-[#C9D0D9] bg-white px-2 py-1 text-sm font-bold">{items.length}</span>
      </div>
      {items.length ? <div className="mt-4 grid gap-4 xl:grid-cols-2">{items.map((booking) => <StayCard key={booking.id} booking={booking} />)}</div> : <p className="mt-4 border border-dashed border-[#D9DEE5] bg-[#F8F7F3] p-5 text-sm text-[#5F6875]">Nothing in this group.</p>}
    </section>
  );
}
