"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

import type { AdminVisitor } from "@/lib/api";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export function VisitorManager({ visitors }: { visitors: AdminVisitor[] }) {
  const [selected, setSelected] = useState<AdminVisitor | null>(null);

  function handleRowKey(event: KeyboardEvent<HTMLTableRowElement>, visitor: AdminVisitor) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelected(visitor);
    }
  }

  return (
    <>
      <section className="admin-panel overflow-hidden">
        <header className="border-b border-neutral-200 p-5 sm:p-6">
          <p className="admin-kicker">Visitor register</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Unique visitors <span className="font-mono text-lg font-normal text-neutral-400">[{visitors.length}]</span>
          </h2>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-neutral-100 text-[11px] uppercase tracking-[0.12em] text-neutral-500">
              <tr>
                {['Visitor ID', 'Name', 'Email', 'Phone', 'Joined', 'Total bookings', 'Previous stays', 'Last reservation', 'Account'].map((heading) => (
                  <th key={heading} scope="col" className="border-b border-neutral-300 px-4 py-3 font-bold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visitors.map((visitor) => {
                const completed = visitor.bookings.filter((booking) => booking.status === "checked_out");
                const lastBooking = visitor.bookings[0];
                return (
                  <tr
                    key={visitor.id}
                    tabIndex={0}
                    aria-label={`Open visitor ${visitor.full_name}`}
                    onClick={() => setSelected(visitor)}
                    onKeyDown={(event) => handleRowKey(event, visitor)}
                    className="cursor-pointer border-b border-neutral-200 bg-white transition-colors hover:bg-neutral-50 focus:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-950"
                  >
                    <td className="px-4 py-4 font-mono text-xs font-semibold text-neutral-950" title={visitor.id}>{shortId(visitor.id)}</td>
                    <td className="px-4 py-4 font-semibold text-neutral-950">{visitor.full_name}</td>
                    <td className="px-4 py-4 text-neutral-600"><span>{visitor.email}</span>{visitor.emails.length > 1 && <span className="mt-1 block text-xs font-semibold text-neutral-400">+{visitor.emails.length - 1} linked account{visitor.emails.length === 2 ? "" : "s"}</span>}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-neutral-600">{visitor.phone || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-neutral-600">{formatDateTime(visitor.created_at, false)}</td>
                    <td className="px-4 py-4 text-center font-semibold">{visitor.bookings.length}</td>
                    <td className="px-4 py-4 text-center font-semibold">{completed.length}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-neutral-600">{lastBooking ? formatStay(lastBooking.check_in, lastBooking.check_out) : "No reservations"}</td>
                    <td className="px-4 py-4"><Status value={visitor.is_active ? "active" : "inactive"} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visitors.length === 0 && <p className="m-5 border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-500">No visitor accounts are available.</p>}
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="visitor-dialog-title" className="max-h-[92vh] w-full max-w-5xl overflow-y-auto border border-neutral-950 bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-5 border-b border-neutral-300 p-5 sm:p-6">
              <div>
                <p className="admin-kicker">Visitor details</p>
                <h2 id="visitor-dialog-title" className="mt-2 text-2xl font-semibold tracking-tight">{selected.full_name}</h2>
                <p className="mt-1 text-sm text-neutral-500">Read-only guest record</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close visitor details" className="grid size-10 shrink-0 place-items-center border border-neutral-300 text-neutral-600 hover:border-neutral-950 hover:text-neutral-950">
                <X className="size-5" aria-hidden="true" />
              </button>
            </header>

            <div className="grid gap-8 p-5 sm:p-6">
              <DetailGroup title="Visitor profile" items={[
                ["Visitor ID", selected.id], ["Full name", selected.full_name], ["Primary email", selected.email],
                ["Phone", selected.phone || "Not provided"], ["Joined", formatDateTime(selected.created_at)],
                ["Account", selected.is_active ? "Active visitor" : "Inactive visitor"], ["Linked accounts", String(selected.account_count)],
              ]} />

              {selected.emails.length > 1 && <section><h3 className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">Known email addresses</h3><ul className="mt-3 grid border-l border-t border-neutral-300 sm:grid-cols-2">{selected.emails.map((email) => <li key={email} className="break-all border-b border-r border-neutral-300 p-3 text-sm font-medium">{email}</li>)}</ul></section>}

              <section>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div><p className="admin-kicker">Reservation history</p><h3 className="mt-2 text-xl font-semibold">Previous stays and bookings</h3></div>
                  <p className="text-sm text-neutral-500">{selected.bookings.length} total reservation{selected.bookings.length === 1 ? "" : "s"}</p>
                </div>
                <div className="mt-4 overflow-x-auto border border-neutral-300">
                  <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                    <thead className="bg-neutral-100 text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                      <tr>{['Booking ID', 'Room', 'Reservation dates', 'Guests', 'Nights', 'Total', 'Status'].map((heading) => <th key={heading} className="border-b border-neutral-300 px-4 py-3">{heading}</th>)}</tr>
                    </thead>
                    <tbody>
                      {selected.bookings.map((booking) => <tr key={booking.id} className="border-b border-neutral-200 last:border-b-0">
                        <td className="px-4 py-4 font-mono text-xs font-semibold">{booking.booking_reference}</td>
                        <td className="px-4 py-4"><span className="font-semibold">{booking.category_name}</span><span className="block text-xs text-neutral-500">Room {booking.room_number}</span></td>
                        <td className="whitespace-nowrap px-4 py-4 text-neutral-600">{formatStay(booking.check_in, booking.check_out)}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-neutral-600">{booking.adult_count}A · {booking.child_count}C</td>
                        <td className="px-4 py-4 text-neutral-600">{booking.night_count}</td>
                        <td className="whitespace-nowrap px-4 py-4 font-semibold">{money.format(Number(booking.total_amount))}</td>
                        <td className="px-4 py-4"><Status value={booking.status} /></td>
                      </tr>)}
                    </tbody>
                  </table>
                  {selected.bookings.length === 0 && <p className="p-5 text-sm text-neutral-500">This visitor has no reservation history.</p>}
                </div>
              </section>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function DetailGroup({ title, items }: { title: string; items: Array<[string, string]> }) {
  return <section><h3 className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">{title}</h3><dl className="mt-3 grid border-l border-t border-neutral-300 sm:grid-cols-2 lg:grid-cols-3">{items.map(([term, value]) => <div key={term} className="border-b border-r border-neutral-300 p-3"><dt className="text-xs font-semibold text-neutral-500">{term}</dt><dd className="mt-1 break-words text-sm font-medium text-neutral-950">{value}</dd></div>)}</dl></section>;
}

function Status({ value }: { value: string }) {
  return <span className="inline-flex whitespace-nowrap border border-neutral-300 bg-neutral-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-700">{value.replace("_", " ")}</span>;
}

function shortId(value: string) { return value.split("-")[0].toUpperCase(); }
function formatDateTime(value: string, includeTime = true) { const date = new Date(value); const formattedDate = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date); if (!includeTime) return formattedDate; return `${formattedDate} at ${new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(date)}`; }
function formatDateOnly(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
function formatStay(checkIn: string, checkOut: string) { return `${formatDateOnly(checkIn)} – ${formatDateOnly(checkOut)}`; }
