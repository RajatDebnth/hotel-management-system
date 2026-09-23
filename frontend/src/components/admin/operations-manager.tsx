"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { AdminBookingList, AdminEnquiryList, AdminOption } from "@/lib/api";
import { updateAdminBooking, updateAdminEnquiry } from "@/lib/api";

const bookingTransitions: Record<string, string[]> = {
  pending: ["confirmed", "rejected", "cancelled"], confirmed: ["checked_in", "cancelled"],
  checked_in: ["checked_out"], checked_out: [], cancelled: [], rejected: [],
};
const enquiryTransitions: Record<string, string[]> = {
  new: ["in_progress", "resolved", "closed"], in_progress: ["resolved", "closed"],
  resolved: ["in_progress", "closed"], closed: [],
};

export function OperationsManager({ bookings, enquiries, admins }: { bookings: AdminBookingList; enquiries: AdminEnquiryList; admins: AdminOption[] }) {
  const router = useRouter();
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");

  async function act(id: string, action: () => Promise<unknown>) {
    setPending(id); setMessage("");
    try { await action(); setMessage("Operation saved."); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Operation failed."); }
    finally { setPending(""); }
  }

  return (
    <div className="grid gap-10">
      {message && <p className="border border-neutral-300 bg-white p-3 text-sm" role="status">{message}</p>}
      <Queue title="Bookings" total={bookings.total} kind="booking" statuses={["pending", "confirmed", "checked_in", "checked_out", "cancelled", "rejected"]}>
        {bookings.items.length === 0 ? <Empty /> : bookings.items.map((item) => <article key={item.id} className="border-t border-neutral-200 py-6 first:border-t-0"><div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><div><p className="font-semibold">{item.booking_reference} · {item.guest_name}</p><p className="mt-1 text-sm text-neutral-500">{item.category_name}, room {item.room_number} · {item.check_in} → {item.check_out}</p></div><Status value={item.status} /></div>{bookingTransitions[item.status]?.length ? <form className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto]" onSubmit={(e) => { e.preventDefault(); const form = new FormData(e.currentTarget); act(item.id, () => updateAdminBooking(item.id, String(form.get("status")), String(form.get("reason")))); }}><select name="status" aria-label={`New status for ${item.booking_reference}`} className="field">{bookingTransitions[item.status].map((value) => <option key={value}>{value}</option>)}</select><input name="reason" aria-label={`Reason for changing ${item.booking_reference}`} required minLength={3} maxLength={500} placeholder="Reason for status change" className="field" /><button disabled={pending === item.id} className="admin-primary-button">Update</button></form> : <p className="mt-3 text-sm text-neutral-500">Final status—no further transitions.</p>}</article>)}
        <Pagination page={bookings.page} pages={bookings.pages} kind="booking" />
      </Queue>
      <Queue title="Enquiries" total={enquiries.total} kind="enquiry" statuses={["new", "in_progress", "resolved", "closed"]}>
        {enquiries.items.length === 0 ? <Empty /> : enquiries.items.map((item) => <article key={item.id} className="border-t border-neutral-200 py-6 first:border-t-0"><div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><div><p className="font-semibold">{item.subject}</p><p className="mt-1 text-sm text-neutral-500">{item.name} · {item.email}</p></div><Status value={item.status} /></div><p className="mt-4 border-l-2 border-neutral-950 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">{item.message}</p><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => submitEnquiry(e, item, act)}><label className="grid gap-2 text-sm font-semibold">Status<select name="status" defaultValue={item.status} className="field"><option value={item.status}>{item.status}</option>{enquiryTransitions[item.status]?.map((value) => <option key={value}>{value}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold">Assigned administrator<select name="assigned_to" defaultValue={item.assigned_to ?? ""} className="field"><option value="">Unassigned</option>{admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.full_name || "Administrator"}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold sm:col-span-2">Internal notes<textarea name="admin_notes" defaultValue={item.admin_notes ?? ""} maxLength={5000} rows={3} className="field" /></label><button disabled={pending === item.id} className="admin-primary-button w-fit">Save enquiry</button></form></article>)}
        <Pagination page={enquiries.page} pages={enquiries.pages} kind="enquiry" />
      </Queue>
    </div>
  );
}

function submitEnquiry(event: FormEvent<HTMLFormElement>, item: AdminEnquiryList["items"][number], act: (id: string, action: () => Promise<unknown>) => Promise<void>) { event.preventDefault(); const form = new FormData(event.currentTarget); void act(item.id, () => updateAdminEnquiry(item.id, { status: String(form.get("status")), assigned_to: String(form.get("assigned_to")) || null, admin_notes: String(form.get("admin_notes")) || null })); }
function Queue({ title, total, kind, statuses, children }: { title: string; total: number; kind: string; statuses: string[]; children: React.ReactNode }) { return <section className="admin-panel"><div className="flex flex-col gap-5 border-b border-neutral-200 p-5 sm:p-6 xl:flex-row xl:items-end xl:justify-between"><div><p className="admin-kicker">Operations queue</p><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title} <span className="font-mono text-lg font-normal text-neutral-400">[{total}]</span></h2></div><form className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_170px_auto]"><input name={`${kind}_q`} aria-label={`Search ${title.toLowerCase()}`} placeholder={`Search ${title.toLowerCase()}`} className="field" /><select name={`${kind}_status`} aria-label={`Filter ${title.toLowerCase()} by status`} className="field"><option value="">All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select><button className="admin-secondary-button">Search</button></form></div><div className="px-5 sm:px-6">{children}</div></section>; }
function Status({ value }: { value: string }) { return <span className="h-fit w-fit border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-neutral-700">{value.replace("_", " ")}</span>; }
function Empty() { return <p className="my-5 border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-500">Nothing matches this queue.</p>; }
function Pagination({ page, pages, kind }: { page: number; pages: number; kind: string }) { if (pages <= 1) return null; return <div className="flex items-center gap-3 border-t border-neutral-200 py-5">{page > 1 && <a href={`?${kind}_page=${page - 1}`} className="admin-secondary-button">Previous</a>}<span className="text-sm text-neutral-500">Page {page} of {pages}</span>{page < pages && <a href={`?${kind}_page=${page + 1}`} className="admin-secondary-button">Next</a>}</div>; }
