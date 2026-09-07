"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";

import { createBooking } from "@/lib/api";
import { bookingSummary } from "@/lib/booking";
import { createClient } from "@/lib/supabase/client";

type Props = {
  categoryId: string;
  categoryName: string;
  maxGuests: number;
  pricePerNight: number;
  email: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
};

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export function BookingForm(props: Props) {
  const [checkIn, setCheckIn] = useState(props.initialCheckIn ?? "");
  const [checkOut, setCheckOut] = useState(props.initialCheckOut ?? "");
  const [adults, setAdults] = useState(props.initialGuests ?? 1);
  const [children, setChildren] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const summary = useMemo(
    () => bookingSummary(props.pricePerNight, checkIn, checkOut),
    [props.pricePerNight, checkIn, checkOut],
  );
  const today = new Date().toISOString().slice(0, 10);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const { data: auth } = await createClient().auth.getSession();
      if (!auth.session?.access_token) throw new Error("Your session expired. Please sign in again.");
      const result = await createBooking({
        category_id: props.categoryId,
        check_in: checkIn,
        check_out: checkOut,
        adult_count: adults,
        child_count: children,
        guest_name: String(data.get("guest_name")),
        guest_email: String(data.get("guest_email")),
        guest_phone: String(data.get("guest_phone")),
        special_requests: String(data.get("special_requests")) || null,
      }, auth.session.access_token);
      setReference(result.booking_reference);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Booking could not be completed.");
    } finally {
      setPending(false);
    }
  }

  if (reference) {
    return (
      <div className="rounded-3xl border border-[#b8cbbd] bg-white p-8 shadow-xl" role="status">
        <p className="eyebrow text-[#947039]">Reservation received</p>
        <h1 className="mt-3 font-heading text-4xl">Your stay is pending confirmation.</h1>
        <p className="mt-5 text-[#5d6d65]">Keep this booking reference:</p>
        <p className="mt-2 font-mono text-2xl font-bold tracking-wide">{reference}</p>
        <Link href="/account" className="mt-7 inline-flex rounded-full bg-[#17352d] px-6 py-3 font-semibold text-white">Go to my account</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="rounded-3xl bg-white p-6 shadow-xl sm:p-8">
        <p className="eyebrow text-[#947039]">Guest details</p>
        <h1 className="mt-3 font-heading text-4xl">Reserve {props.categoryName}</h1>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <Field label="Check-in"><input required type="date" min={today} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="field" /></Field>
          <Field label="Check-out"><input required type="date" min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="field" /></Field>
          <Field label="Adults"><input required type="number" min={1} max={props.maxGuests} value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="field" /></Field>
          <Field label="Children"><input required type="number" min={0} max={props.maxGuests - 1} value={children} onChange={(e) => setChildren(Number(e.target.value))} className="field" /></Field>
          <Field label="Guest name"><input required name="guest_name" minLength={2} maxLength={120} className="field" autoComplete="name" /></Field>
          <Field label="Email"><input required name="guest_email" type="email" defaultValue={props.email} className="field" autoComplete="email" /></Field>
          <Field label="Phone"><input required name="guest_phone" minLength={6} maxLength={30} className="field" autoComplete="tel" /></Field>
          <label className="grid gap-2 sm:col-span-2"><span className="text-sm font-semibold">Special requests <span className="font-normal text-[#6b776f]">(optional)</span></span><textarea name="special_requests" maxLength={2000} rows={4} className="field resize-y" /></label>
        </div>
      </div>
      <aside className="h-fit rounded-3xl bg-[#17352d] p-7 text-white shadow-xl lg:sticky lg:top-8">
        <p className="eyebrow text-[#f1d59e]">Price summary</p>
        <div className="mt-6 space-y-4 text-sm">
          <Price label={`${summary.nights} night${summary.nights === 1 ? "" : "s"} × ${money.format(props.pricePerNight)}`} value={summary.subtotal} />
          <Price label="Taxes (MVP)" value={summary.tax} />
          <div className="border-t border-white/20 pt-4"><Price label="Total" value={summary.total} strong /></div>
        </div>
        <p className="mt-5 text-xs leading-5 text-white/65">No payment is collected now. The hotel will confirm this pending reservation.</p>
        {adults + children > props.maxGuests && <p className="mt-4 text-sm text-[#ffd0c7]" role="alert">Maximum capacity is {props.maxGuests} guests.</p>}
        {error && <p className="mt-4 rounded-xl bg-white/10 p-3 text-sm text-[#ffd0c7]" role="alert">{error}</p>}
        <button disabled={pending || summary.nights < 1 || adults + children > props.maxGuests} className="mt-6 w-full rounded-full bg-[#f1d59e] px-6 py-3.5 font-bold text-[#17352d] disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? "Reserving…" : "Request reservation"}
        </button>
      </aside>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2"><span className="text-sm font-semibold">{label}</span>{children}</label>;
}

function Price({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return <div className={`flex justify-between gap-4 ${strong ? "text-lg font-bold" : ""}`}><span>{label}</span><span>{money.format(value)}</span></div>;
}
