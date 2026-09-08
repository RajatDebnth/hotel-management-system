import { ArrowUpRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getDashboardSummary, getOccupancyReport, getRevenueReport } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

type Search = { start_date?: string; end_date?: string };
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<Search> }) {
  const query = await searchParams;
  const startDate = query.start_date ?? iso(new Date());
  const defaultEnd = new Date(`${startDate}T00:00:00Z`);
  defaultEnd.setUTCDate(defaultEnd.getUTCDate() + 30);
  const endDate = query.end_date ?? iso(defaultEnd);
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) redirect("/login?next=/admin");
  const token = data.session.access_token;
  const [summary, occupancy, revenue] = await Promise.all([
    getDashboardSummary(token),
    getOccupancyReport(token, startDate, endDate),
    getRevenueReport(token, startDate, endDate),
  ]);
  const cards = [
    ["Active rooms", summary.total_active_rooms],
    ["Occupied today", summary.occupied_rooms],
    ["Occupancy today", `${summary.occupancy_percentage}%`],
    ["Arrivals", summary.arrivals],
    ["Departures", summary.departures],
    ["Pending bookings", summary.pending_bookings],
    ["Open enquiries", summary.open_enquiries],
  ];

  return (
    <main className="admin-page">
      <PageHeading
        kicker="Overview"
        title="House overview"
        description="Today’s operating position, upcoming room nights, and recent reservation activity."
      />

      <section aria-label="Hotel summary" className="mt-8 grid border-t border-l border-neutral-200 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value], index) => (
          <div key={label} className="min-h-32 border-r border-b border-neutral-200 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium text-neutral-500">{label}</p>
              <span className="font-mono text-xs text-neutral-400">{String(index + 1).padStart(2, "0")}</span>
            </div>
            <p className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">{value}</p>
          </div>
        ))}
      </section>

      <section className="admin-panel mt-8">
        <div className="flex flex-col gap-6 border-b border-neutral-200 p-5 sm:p-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="admin-kicker">Reporting window</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Occupancy and booked revenue</h2>
          </div>
          <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="grid gap-2 text-sm font-semibold text-neutral-700">
              Start date
              <input type="date" name="start_date" defaultValue={startDate} className="field" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-neutral-700">
              End date (exclusive)
              <input type="date" name="end_date" defaultValue={endDate} className="field" />
            </label>
            <button className="admin-primary-button self-end">
              <CalendarDays className="size-4" aria-hidden="true" />
              Apply range
            </button>
          </form>
        </div>

        <div className="grid border-b border-neutral-200 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Available room-nights" value={occupancy.available_room_nights} />
          <Metric label="Occupied room-nights" value={occupancy.occupied_room_nights} />
          <Metric label="Period occupancy" value={`${occupancy.occupancy_percentage}%`} />
          <Metric label="Booked revenue" value={money.format(Number(revenue.booked_revenue))} />
        </div>

        <div className="p-5 sm:p-6">
          {occupancy.days.length === 0 ? (
            <p className="border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-500">No dates in this report.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex min-w-[700px] items-end gap-1 border-b border-neutral-300 pt-4" style={{ height: 220 }}>
                {occupancy.days.map((day) => (
                  <div
                    key={day.date}
                    className="group flex min-w-4 flex-1 flex-col justify-end"
                    title={`${day.date}: ${day.occupancy_percentage}% · ${money.format(Number(revenue.days.find((item) => item.date === day.date)?.booked_revenue ?? 0))}`}
                  >
                    <div
                      className="bg-neutral-900 transition-colors group-hover:bg-neutral-500"
                      style={{ height: `${Math.max(2, Number(day.occupancy_percentage) * 1.8)}px` }}
                    />
                    <span className="mt-2 font-mono text-[11px] text-neutral-500">{day.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="admin-panel mt-8">
        <div className="flex items-end justify-between gap-4 border-b border-neutral-200 p-5 sm:p-6">
          <div>
            <p className="admin-kicker">Latest activity</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Recent bookings</h2>
          </div>
          <Link href="/admin/operations" className="admin-secondary-button">
            Open operations
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {summary.recent_bookings.length === 0 ? (
          <p className="m-5 border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-500 sm:m-6">No bookings yet.</p>
        ) : (
          <div className="divide-y divide-neutral-200">
            {summary.recent_bookings.map((booking) => (
              <div key={booking.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
                <div>
                  <p className="font-semibold">{booking.booking_reference} · {booking.guest_name}</p>
                  <p className="mt-1 text-sm text-neutral-500">{booking.category_name} · {booking.check_in} → {booking.check_out}</p>
                </div>
                <Status value={booking.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function PageHeading({ kicker, title, description }: { kicker: string; title: string; description: string }) {
  return (
    <header className="border-b border-neutral-300 pb-7">
      <p className="admin-kicker">{kicker}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-500">{description}</p>
    </header>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-b border-neutral-200 p-5 last:border-b-0 sm:border-r sm:p-6 sm:[&:nth-child(2n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2n)]:border-r xl:last:border-r-0">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function Status({ value }: { value: string }) {
  return <span className="w-fit border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-neutral-700">{value.replace("_", " ")}</span>;
}
