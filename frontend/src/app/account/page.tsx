import { ArrowRight, CalendarCheck, CircleUserRound, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { StayCard } from "@/components/account/stay-card";
import { groupStays } from "@/lib/account/bookings";
import { getBookings, getProfile } from "@/lib/api";
import { getSessionCookieHeader } from "@/lib/auth/session";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  const cookie = await getSessionCookieHeader();
  if (!cookie) redirect("/login?next=/account");
  const [profile, bookings] = await Promise.all([getProfile({ cookie }), getBookings({ cookie })]);
  const groups = groupStays(bookings.items);
  const nextStay = groups.active[0] ?? groups.upcoming[0];

  return (
    <main>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A06F29]">Account overview</p>
      <h1 className="mt-2 font-heading text-4xl sm:text-5xl">Welcome, {profile.full_name}</h1>
      <p className="mt-3 max-w-2xl text-[#5F6875]">Your reservations, personal details, and account security in one clear workspace.</p>

      {(params.error || params.message) && (
        <p className={`mt-6 border p-4 text-sm ${params.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`} role={params.error ? "alert" : "status"}>
          {params.error ?? params.message}
        </p>
      )}

      <section aria-label="Account summary" className="mt-8 grid gap-3 sm:grid-cols-3">
        <Summary label="Active now" value={groups.active.length} icon={CalendarCheck} />
        <Summary label="Upcoming" value={groups.upcoming.length} icon={CalendarCheck} />
        <Summary label="Total stays" value={bookings.items.length} icon={CalendarCheck} />
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
        <section>
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A06F29]">Next reservation</p><h2 className="mt-2 text-2xl font-semibold">Your stay at a glance</h2></div>
            <Link href="/account/stays" className="hidden text-sm font-bold text-[#405066] hover:text-[#132A46] sm:inline-flex">View all stays</Link>
          </div>
          <div className="mt-4">
            {nextStay ? <StayCard booking={nextStay} /> : (
              <div className="border border-dashed border-[#C9D0D9] bg-white p-7">
                <p className="font-semibold">No active or upcoming reservation.</p>
                <p className="mt-2 text-sm text-[#5F6875]">When you request a stay, its confirmation progress will appear here.</p>
                <Link href="/rooms" className="mt-5 inline-flex min-h-11 items-center gap-2 bg-[#132A46] px-5 text-sm font-semibold text-white">Find a room <ArrowRight className="size-4" aria-hidden="true" /></Link>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="account-actions-title" className="border border-[#D9DEE5] bg-[#F8F7F3] p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A06F29]">Account readiness</p>
          <h2 id="account-actions-title" className="mt-2 text-2xl font-semibold">Keep details current</h2>
          <div className="mt-5 grid gap-3">
            <Action href="/account/details" icon={CircleUserRound} title="Personal details" detail={profile.phone ? "Contact information complete" : "Add a phone number for your stay"} />
            <Action href="/account/security" icon={ShieldCheck} title="Password & security" detail="Manage your sign-in password" />
          </div>
        </section>
      </div>
    </main>
  );
}

type Icon = typeof CalendarCheck;

function Summary({ label, value, icon: Icon }: { label: string; value: number; icon: Icon }) {
  return <div className="flex items-center gap-4 border border-[#D9DEE5] bg-white p-5"><span className="grid size-10 place-items-center bg-[#132A46] text-white"><Icon className="size-5" aria-hidden="true" /></span><div><p className="text-2xl font-semibold">{value}</p><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5F6875]">{label}</p></div></div>;
}

function Action({ href, icon: Icon, title, detail }: { href: string; icon: Icon; title: string; detail: string }) {
  return <Link href={href} className="group flex items-center gap-3 border border-[#D9DEE5] bg-white p-4 hover:border-[#A9782F]"><Icon className="size-5 text-[#A9782F]" aria-hidden="true" /><span><span className="block text-sm font-semibold">{title}</span><span className="mt-0.5 block text-xs text-[#5F6875]">{detail}</span></span><ArrowRight className="ml-auto size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link>;
}
