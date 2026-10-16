"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

import type { AdminBookingList } from "@/lib/api";
import { updateAdminBooking } from "@/lib/api";

type Booking = AdminBookingList["items"][number];

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const bookingTransitions: Record<string, string[]> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["checked_in", "cancelled"],
  checked_in: ["checked_out"],
  checked_out: [],
  cancelled: [],
  rejected: [],
};

export function BookingManager({ bookings }: { bookings: AdminBookingList }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Booking | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  function openBooking(booking: Booking) {
    setMessage("");
    setSelected(booking);
  }

  function handleRowKey(event: KeyboardEvent<HTMLTableRowElement>, booking: Booking) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openBooking(booking);
    }
  }

  async function updateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    try {
      await updateAdminBooking(selected.id, String(form.get("status")), String(form.get("reason")));
      setSelected(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The booking could not be updated.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <section className="admin-panel overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-neutral-200 p-5 sm:p-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="admin-kicker">Reservation register</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Bookings <span className="font-mono text-lg font-normal text-neutral-400">[{bookings.total}]</span>
            </h2>
          </div>
          <form className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_170px_auto]">
            <input name="booking_q" aria-label="Search bookings" placeholder="ID, guest, room or category" className="field" />
            <select name="booking_status" aria-label="Filter bookings by status" className="field">
              <option value="">All statuses</option>
              {["pending", "confirmed", "checked_in", "checked_out", "cancelled", "rejected"].map((status) => <option key={status}>{status}</option>)}
            </select>
            <button className="admin-secondary-button">Search</button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
            <thead className="bg-neutral-100 text-[11px] uppercase tracking-[0.12em] text-neutral-500">
              <tr>
                {['Booking ID', 'Name', 'Booking date', 'Booking time', 'Room category', 'Room no.', 'Reservation dates', 'Guests', 'Amount', 'Status'].map((heading) => (
                  <th key={heading} scope="col" className="border-b border-neutral-300 px-4 py-3 font-bold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.items.map((booking) => {
                const created = new Date(booking.created_at);
                return (
                  <tr
                    key={booking.id}
                    tabIndex={0}
                    aria-label={`Open booking ${booking.booking_reference}`}
                    onClick={() => openBooking(booking)}
                    onKeyDown={(event) => handleRowKey(event, booking)}
                    className="cursor-pointer border-b border-neutral-200 bg-white transition-colors hover:bg-neutral-50 focus:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-950"
                  >
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-semibold text-neutral-950">{booking.booking_reference}</td>
                    <td className="px-4 py-4 font-semibold text-neutral-950">{booking.guest_name}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-neutral-600">{formatDate(created)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-neutral-600">{formatTime(created)}</td>
                    <td className="px-4 py-4 text-neutral-700">{booking.category_name}</td>
                    <td className="px-4 py-4 font-mono text-neutral-700">{booking.room_number}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-neutral-600">{formatStay(booking.check_in, booking.check_out)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-neutral-600">{booking.adult_count}A · {booking.child_count}C</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-neutral-950">{money.format(Number(booking.total_amount))}</td>
                    <td className="px-4 py-4"><Status value={booking.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {bookings.items.length === 0 && <p className="m-5 border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-500">No bookings match this view.</p>}
        </div>

        <Pagination page={bookings.page} pages={bookings.pages} />
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="booking-dialog-title" className="max-h-[92vh] w-full max-w-4xl overflow-y-auto border border-neutral-950 bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-5 border-b border-neutral-300 p-5 sm:p-6">
              <div>
                <p className="admin-kicker">Booking details</p>
                <h2 id="booking-dialog-title" className="mt-2 text-2xl font-semibold tracking-tight">{selected.booking_reference}</h2>
                <p className="mt-1 text-sm text-neutral-500">Created {formatDateTime(new Date(selected.created_at))}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close booking details" className="grid size-10 place-items-center border border-neutral-300 text-neutral-600 hover:border-neutral-950 hover:text-neutral-950">
                <X className="size-5" aria-hidden="true" />
              </button>
            </header>

            <div className="grid gap-8 p-5 sm:p-6 lg:grid-cols-[1fr_320px]">
              <div className="grid content-start gap-7">
                <DetailGroup title="Guest" items={[
                  ["Name", selected.guest_name], ["Email", selected.guest_email], ["Phone", selected.guest_phone],
                  ["Guests", `${selected.adult_count} adult${selected.adult_count === 1 ? "" : "s"}, ${selected.child_count} child${selected.child_count === 1 ? "" : "ren"}`],
                ]} />
                <DetailGroup title="Stay" items={[
                  ["Room category", selected.category_name], ["Room number", selected.room_number],
                  ["Check-in", formatDateOnly(selected.check_in)], ["Check-out", formatDateOnly(selected.check_out)], ["Nights", String(selected.night_count)],
                ]} />
                <DetailGroup title="Payment summary" items={[
                  ["Price per night", money.format(Number(selected.price_per_night))], ["Subtotal", money.format(Number(selected.subtotal))],
                  ["Tax", money.format(Number(selected.tax_amount))], ["Total", money.format(Number(selected.total_amount))],
                ]} />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">Special requests</h3>
                  <p className="mt-3 border-l-2 border-neutral-950 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">{selected.special_requests || "No special requests provided."}</p>
                </div>
              </div>

              <aside className="h-fit border border-neutral-300 bg-neutral-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Booking status</h3>
                  <Status value={selected.status} />
                </div>
                {bookingTransitions[selected.status]?.length ? (
                  <form className="mt-5 grid gap-4" onSubmit={updateStatus}>
                    <label className="grid gap-2 text-sm font-semibold">New status
                      <select name="status" className="field">
                        {bookingTransitions[selected.status].map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm font-semibold">Confirmation message / update note
                      <textarea name="reason" required minLength={3} maxLength={500} rows={5} className="field" placeholder="Example: Guest confirmed by phone; room is ready." />
                    </label>
                    {message && <p className="border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{message}</p>}
                    <button disabled={pending} className="admin-primary-button">{pending ? "Saving…" : "Save status update"}</button>
                  </form>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-neutral-500">This booking has reached a final status and cannot be changed further.</p>
                )}
              </aside>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function DetailGroup({ title, items }: { title: string; items: Array<[string, string]> }) {
  return <section><h3 className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">{title}</h3><dl className="mt-3 grid border-l border-t border-neutral-300 sm:grid-cols-2">{items.map(([term, value]) => <div key={term} className="border-b border-r border-neutral-300 p-3"><dt className="text-xs font-semibold text-neutral-500">{term}</dt><dd className="mt-1 break-words text-sm font-medium text-neutral-950">{value}</dd></div>)}</dl></section>;
}

function Status({ value }: { value: string }) {
  return <span className="inline-flex whitespace-nowrap border border-neutral-300 bg-neutral-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-700">{value.replace("_", " ")}</span>;
}

function Pagination({ page, pages }: { page: number; pages: number }) {
  if (pages <= 1) return null;
  return <div className="flex items-center gap-3 p-5">{page > 1 && <a href={`?booking_page=${page - 1}`} className="admin-secondary-button">Previous</a>}<span className="text-sm text-neutral-500">Page {page} of {pages}</span>{page < pages && <a href={`?booking_page=${page + 1}`} className="admin-secondary-button">Next</a>}</div>;
}

function formatDate(value: Date) { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(value); }
function formatTime(value: Date) { return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(value); }
function formatDateTime(value: Date) { return `${formatDate(value)} at ${formatTime(value)}`; }
function formatDateOnly(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
function formatStay(checkIn: string, checkOut: string) { return `${formatDateOnly(checkIn)} – ${formatDateOnly(checkOut)}`; }
