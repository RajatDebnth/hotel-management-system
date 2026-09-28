import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/account/profile-form";
import { changePassword } from "@/app/auth/actions";
import { fieldClassName } from "@/components/auth/auth-shell";
import { getBookings, getProfile } from "@/lib/api";
import { getSessionCookieHeader } from "@/lib/auth/session";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  const cookie = await getSessionCookieHeader();
  if (!cookie) redirect("/login?next=/account");
  const [profile, bookings] = await Promise.all([
    getProfile({ cookie }), getBookings({ cookie }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow text-[#947039]">Customer account</p>
      <h1 className="mt-2 font-heading text-5xl">Welcome, {profile.full_name}</h1>
      <p className="mt-3 text-[#5d6d65]">Manage your contact details and reservations.</p>
      {(params.error || params.message) && <p className={`mt-6 rounded-xl p-4 text-sm ${params.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`} role={params.error ? "alert" : "status"}>{params.error ?? params.message}</p>}
      <div className="mt-10 grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
        <div className="grid h-fit gap-8">
          <div id="profile" className="scroll-mt-24"><ProfileForm profile={profile} /></div>
          <form id="security" action={changePassword} className="scroll-mt-24 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <h2 className="font-heading text-3xl">Change password</h2>
            <p className="mt-2 text-sm text-[#5d6d65]">Use at least 12 characters.</p>
            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold">Current password<input className={fieldClassName} name="currentPassword" type="password" autoComplete="current-password" required /></label>
              <label className="grid gap-2 text-sm font-semibold">New password<input className={fieldClassName} name="newPassword" type="password" autoComplete="new-password" minLength={12} required /></label>
              <label className="grid gap-2 text-sm font-semibold">Confirm new password<input className={fieldClassName} name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required /></label>
            </div>
            <button className="mt-6 rounded-full bg-[#17352d] px-6 py-3 font-semibold text-white">Update password</button>
          </form>
        </div>
        <section id="stays" className="scroll-mt-24 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-end justify-between gap-4"><div><p className="eyebrow text-[#947039]">Your stays</p><h2 className="mt-2 font-heading text-3xl">Reservations</h2></div><Link href="/rooms" className="text-sm font-semibold underline">Book another stay</Link></div>
          {bookings.items.length === 0 ? (
            <div className="mt-8 rounded-2xl bg-[#f6f2e9] p-6"><p className="font-semibold">No reservations yet.</p><p className="mt-2 text-sm text-[#5d6d65]">Explore the rooms when you are ready for a quiet escape.</p></div>
          ) : (
            <div className="mt-6 divide-y">{bookings.items.map((booking) => (
              <Link key={booking.id} href={`/account/bookings/${booking.booking_reference}`} className="flex flex-col gap-3 py-5 transition hover:bg-[#faf8f2] sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-semibold">{booking.category_name} · Room {booking.room_number}</p><p className="mt-1 text-sm text-[#5d6d65]">{booking.check_in} → {booking.check_out} · {booking.night_count} nights</p><p className="mt-1 font-mono text-xs">{booking.booking_reference}</p></div>
                <div className="sm:text-right"><span className="inline-flex rounded-full bg-[#dfe7dd] px-3 py-1 text-xs font-bold capitalize">{booking.status.replace("_", " ")}</span><p className="mt-2 font-semibold">{money.format(Number(booking.total_amount))}</p></div>
              </Link>
            ))}</div>
          )}
        </section>
      </div>
    </main>
  );
}
