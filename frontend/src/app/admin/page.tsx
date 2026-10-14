import { ArrowRight, CalendarDays, CircleAlert, DoorOpen, LogIn, LogOut, MoonStar } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import type { Booking } from "@/lib/api";
import { getDashboardSummary, getOccupancyReport, getRevenueReport } from "@/lib/api";
import { getSessionCookieHeader } from "@/lib/auth/session";

type Search = { report_date?: string; start_date?: string; end_date?: string };
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<Search> }) {
  const query = await searchParams;
  const reportDate = query.report_date ?? iso(new Date());
  const startDate = query.start_date ?? reportDate;
  const defaultEnd = new Date(`${startDate}T00:00:00Z`);
  defaultEnd.setUTCDate(defaultEnd.getUTCDate() + 30);
  const endDate = query.end_date ?? iso(defaultEnd);
  const cookie = await getSessionCookieHeader();
  if (!cookie) redirect("/login?next=/admin");

  const [summary, occupancy, revenue] = await Promise.all([
    getDashboardSummary(reportDate, { cookie }),
    getOccupancyReport(startDate, endDate, { cookie }),
    getRevenueReport(startDate, endDate, { cookie }),
  ]);
  const availableRooms = Math.max(0, summary.total_active_rooms - summary.occupied_rooms);

  return (
    <main className="admin-page">
      <header className="flex flex-col gap-5 border-b border-neutral-300 pb-7 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="admin-kicker">Front desk · {reportDate}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Today at Aurelia House</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-500">The daily operating picture—guest movement, rooms, and work that needs attention.</p>
        </div>
        <form className="flex items-end gap-2">
          <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
            Operating date
            <input type="date" name="report_date" defaultValue={reportDate} className="field min-w-44" />
          </label>
          <button className="admin-primary-button" aria-label="Load operating date"><CalendarDays className="size-4" aria-hidden="true" />Load day</button>
        </form>
      </header>

      <section aria-label="Today’s room position" className="mt-8 grid border-t border-l border-neutral-200 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active rooms" value={summary.total_active_rooms} detail="Sellable inventory" />
        <Metric label="Occupied" value={summary.occupied_rooms} detail={`${summary.occupancy_percentage}% occupancy`} />
        <Metric label="Available" value={availableRooms} detail="At close of snapshot" />
        <Metric label="In house" value={summary.in_house_bookings.length} detail="Checked-in stays" />
      </section>

      <section aria-labelledby="attention-heading" className="mt-8 grid border border-neutral-950 bg-neutral-950 text-white lg:grid-cols-[1fr_auto_auto] lg:items-center">
        <div className="flex items-start gap-3 p-5 sm:p-6">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div><p id="attention-heading" className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">Needs attention</p><p className="mt-2 text-lg font-semibold">Resolve new demand before the next shift.</p></div>
        </div>
        <AttentionLink label="Pending bookings" count={summary.pending_bookings} href="/admin/operations?booking_status=pending" />
        <AttentionLink label="Open enquiries" count={summary.open_enquiries} href="/admin/operations?enquiry_status=new" />
      </section>

      <section className="admin-panel mt-8" aria-labelledby="movement-heading">
        <div className="flex items-end justify-between gap-4 border-b border-neutral-200 p-5 sm:p-6">
          <div><p className="admin-kicker">Guest movement</p><h2 id="movement-heading" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Front desk board</h2></div>
          <Link href="/admin/operations" className="admin-secondary-button">All reservations <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
        <div className="grid xl:grid-cols-3">
          <MovementColumn icon={LogIn} title="Arrivals" count={summary.arrivals} empty="No arrivals scheduled." bookings={summary.arrival_bookings} />
          <MovementColumn icon={MoonStar} title="In house" count={summary.in_house_bookings.length} empty="No guests currently checked in." bookings={summary.in_house_bookings} />
          <MovementColumn icon={LogOut} title="Departures" count={summary.departures} empty="No departures scheduled." bookings={summary.departure_bookings} />
        </div>
      </section>

      <section className="admin-panel mt-8">
        <div className="flex flex-col gap-6 border-b border-neutral-200 p-5 sm:p-6 xl:flex-row xl:items-end xl:justify-between">
          <div><p className="admin-kicker">Performance</p><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Occupancy and booked revenue</h2></div>
          <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input type="hidden" name="report_date" value={reportDate} />
            <DateField label="Start date" name="start_date" value={startDate} />
            <DateField label="End date (exclusive)" name="end_date" value={endDate} />
            <button className="admin-primary-button self-end">Apply range</button>
          </form>
        </div>
        <div className="grid border-b border-neutral-200 sm:grid-cols-2 xl:grid-cols-4">
          <ReportMetric label="Available room-nights" value={occupancy.available_room_nights} />
          <ReportMetric label="Occupied room-nights" value={occupancy.occupied_room_nights} />
          <ReportMetric label="Period occupancy" value={`${occupancy.occupancy_percentage}%`} />
          <ReportMetric label="Booked revenue" value={money.format(Number(revenue.booked_revenue))} />
        </div>
        <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
          <div className="border-b border-neutral-200 p-5 sm:p-6 lg:border-r lg:border-b-0">
            {occupancy.days.length === 0 ? <EmptyState text="No dates in this report." /> : (
              <div className="overflow-x-auto" aria-label="Daily occupancy chart">
                <div className="flex min-w-[650px] items-end gap-1 border-b border-neutral-300 pt-4" style={{ height: 220 }}>
                  {occupancy.days.map((day) => <div key={day.date} className="group flex min-w-4 flex-1 flex-col justify-end" title={`${day.date}: ${day.occupancy_percentage}% occupancy`}><div className="bg-neutral-900 transition-colors group-hover:bg-neutral-500" style={{ height: `${Math.max(2, Number(day.occupancy_percentage) * 1.8)}px` }} /><span className="mt-2 font-mono text-[11px] text-neutral-500">{day.date.slice(5)}</span></div>)}
                </div>
              </div>
            )}
          </div>
          <div>
            <div className="border-b border-neutral-200 p-5 sm:p-6"><p className="admin-kicker">Latest activity</p><h3 className="mt-2 text-xl font-semibold">Recent bookings</h3></div>
            {summary.recent_bookings.length === 0 ? <div className="p-5 sm:p-6"><EmptyState text="No bookings yet." /></div> : (
              <div className="divide-y divide-neutral-200">{summary.recent_bookings.map((booking) => <div key={booking.id} className="p-4 sm:px-6"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{booking.guest_name}</p><p className="mt-1 text-xs text-neutral-500">{booking.booking_reference} · Room {booking.room_number}</p></div><Status value={booking.status} /></div></div>)}</div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <div className="min-h-32 border-r border-b border-neutral-200 bg-white p-5 sm:p-6"><p className="text-sm font-medium text-neutral-500">{label}</p><p className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">{value}</p><p className="mt-2 text-xs text-neutral-500">{detail}</p></div>;
}

function AttentionLink({ label, count, href }: { label: string; count: number; href: string }) {
  return <Link href={href} className="flex min-h-24 items-center justify-between gap-8 border-t border-neutral-700 px-5 transition-colors hover:bg-neutral-800 sm:px-6 lg:border-t-0 lg:border-l"><div><p className="text-3xl font-semibold">{count}</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">{label}</p></div><ArrowRight className="size-5" aria-hidden="true" /></Link>;
}

function MovementColumn({ icon: Icon, title, count, empty, bookings }: { icon: typeof DoorOpen; title: string; count: number; empty: string; bookings: Booking[] }) {
  return <section className="border-b border-neutral-200 last:border-b-0 xl:border-r xl:border-b-0 xl:last:border-r-0"><div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-5 py-4"><div className="flex items-center gap-2"><Icon className="size-4" aria-hidden="true" /><h3 className="text-sm font-bold uppercase tracking-[0.12em]">{title}</h3></div><span className="border border-neutral-300 bg-white px-2 py-0.5 font-mono text-xs">{count}</span></div>{bookings.length === 0 ? <div className="p-5 sm:p-6"><EmptyState text={empty} /></div> : <div className="divide-y divide-neutral-200">{bookings.map((booking) => <div key={booking.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4 sm:px-5"><span className="flex size-9 items-center justify-center border border-neutral-300 bg-neutral-50 text-xs font-bold">{booking.room_number}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{booking.guest_name}</p><p className="mt-0.5 truncate text-xs text-neutral-500">{booking.category_name} · {booking.booking_reference}</p></div><Status value={booking.status} /></div>)}</div>}</section>;
}

function DateField({ label, name, value }: { label: string; name: string; value: string }) {
  return <label className="grid gap-2 text-sm font-semibold text-neutral-700">{label}<input type="date" name={name} defaultValue={value} className="field" /></label>;
}

function ReportMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="border-b border-neutral-200 p-5 last:border-b-0 sm:border-r sm:p-6 sm:[&:nth-child(2n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2n)]:border-r xl:last:border-r-0"><p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">{label}</p><p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p></div>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-500">{text}</p>;
}

function Status({ value }: { value: string }) {
  return <span className="w-fit shrink-0 border border-neutral-300 bg-neutral-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-700">{value.replaceAll("_", " ")}</span>;
}
