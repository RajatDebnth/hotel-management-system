import { redirect } from "next/navigation";

import Link from "next/link";

import { getDashboardSummary, getOccupancyReport, getRevenueReport } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

type Search = { start_date?: string; end_date?: string };
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
function iso(date: Date) { return date.toISOString().slice(0, 10); }

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
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow text-[#947039]">Administrator</p>
      <h1 className="mt-2 font-heading text-5xl">House overview</h1>
      <p className="mt-3 text-[#5d6d65]">Today&apos;s operational pulse and a checkout-exclusive view of future room nights.</p>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="rounded-3xl bg-white p-6 shadow-sm"><p className="text-sm text-[#5d6d65]">{label}</p><p className="mt-2 font-heading text-4xl">{value}</p></div>)}</section>
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="eyebrow text-[#947039]">Reporting window</p><h2 className="mt-2 font-heading text-4xl">Occupancy & booked revenue</h2></div><form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><label className="grid gap-1 text-xs font-bold">Start<input type="date" name="start_date" defaultValue={startDate} className="field" /></label><label className="grid gap-1 text-xs font-bold">End (exclusive)<input type="date" name="end_date" defaultValue={endDate} className="field" /></label><button className="self-end rounded-full bg-[#17352d] px-5 py-3 font-bold text-white">Apply</button></form></div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Available room-nights" value={occupancy.available_room_nights} /><Metric label="Occupied room-nights" value={occupancy.occupied_room_nights} /><Metric label="Period occupancy" value={`${occupancy.occupancy_percentage}%`} /><Metric label="Booked revenue" value={money.format(Number(revenue.booked_revenue))} /></div>
        {occupancy.days.length === 0 ? <p className="mt-7 rounded-xl bg-[#f6f2e9] p-5">No dates in this report.</p> : <div className="mt-8 overflow-x-auto"><div className="flex min-w-[700px] items-end gap-2 border-b pb-2" style={{ height: 220 }}>{occupancy.days.map((day) => <div key={day.date} className="group flex min-w-4 flex-1 flex-col justify-end" title={`${day.date}: ${day.occupancy_percentage}% · ${money.format(Number(revenue.days.find((item) => item.date === day.date)?.booked_revenue ?? 0))}`}><div className="rounded-t bg-[#947039]" style={{ height: `${Math.max(2, Number(day.occupancy_percentage) * 1.8)}px` }} /><span className="mt-2 text-[10px] text-[#5d6d65]">{day.date.slice(5)}</span></div>)}</div></div>}
      </section>
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8"><div className="flex items-end justify-between"><div><p className="eyebrow text-[#947039]">Latest activity</p><h2 className="mt-2 font-heading text-4xl">Recent bookings</h2></div><Link href="/admin/operations" className="text-sm font-semibold underline">Open operations</Link></div>{summary.recent_bookings.length === 0 ? <p className="mt-6 rounded-xl bg-[#f6f2e9] p-5 text-sm">No bookings yet.</p> : <div className="mt-5 divide-y">{summary.recent_bookings.map((booking) => <div key={booking.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:justify-between"><div><p className="font-semibold">{booking.booking_reference} · {booking.guest_name}</p><p className="text-sm text-[#5d6d65]">{booking.category_name} · {booking.check_in} → {booking.check_out}</p></div><span className="capitalize">{booking.status.replace("_", " ")}</span></div>)}</div>}</section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl bg-[#f6f2e9] p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#7d8a82]">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>;
}
