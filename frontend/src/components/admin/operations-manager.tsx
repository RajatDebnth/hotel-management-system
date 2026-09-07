"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { AdminBookingList, AdminEnquiryList, AdminOption } from "@/lib/api";
import { updateAdminBooking, updateAdminEnquiry } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

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

  async function token() {
    const { data } = await createClient().auth.getSession();
    if (!data.session) throw new Error("Your session expired. Please sign in again.");
    return data.session.access_token;
  }
  async function act(id: string, action: (accessToken: string) => Promise<unknown>) {
    setPending(id); setMessage("");
    try { await action(await token()); setMessage("Operation saved."); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Operation failed."); }
    finally { setPending(""); }
  }

  return (
    <div className="grid gap-10">
      {message && <p className="rounded-xl bg-white p-3 text-sm" role="status">{message}</p>}
      <Queue title="Bookings" total={bookings.total} kind="booking" statuses={["pending", "confirmed", "checked_in", "checked_out", "cancelled", "rejected"]}>
        {bookings.items.length === 0 ? <Empty /> : bookings.items.map((item) => <article key={item.id} className="border-t py-6 first:border-t-0"><div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><div><p className="font-semibold">{item.booking_reference} · {item.guest_name}</p><p className="mt-1 text-sm text-[#5d6d65]">{item.category_name}, room {item.room_number} · {item.check_in} → {item.check_out}</p></div><Status value={item.status} /></div>{bookingTransitions[item.status]?.length ? <form className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto]" onSubmit={(e) => { e.preventDefault(); const form = new FormData(e.currentTarget); act(item.id, (accessToken) => updateAdminBooking(item.id, String(form.get("status")), String(form.get("reason")), accessToken)); }}><select name="status" className="field">{bookingTransitions[item.status].map((value) => <option key={value}>{value}</option>)}</select><input name="reason" required minLength={3} maxLength={500} placeholder="Reason for status change" className="field" /><button disabled={pending === item.id} className="rounded-full bg-[#17352d] px-5 py-2 font-bold text-white">Update</button></form> : <p className="mt-3 text-sm text-[#5d6d65]">Final status—no further transitions.</p>}</article>)}
        <Pagination page={bookings.page} pages={bookings.pages} kind="booking" />
      </Queue>
      <Queue title="Enquiries" total={enquiries.total} kind="enquiry" statuses={["new", "in_progress", "resolved", "closed"]}>
        {enquiries.items.length === 0 ? <Empty /> : enquiries.items.map((item) => <article key={item.id} className="border-t py-6 first:border-t-0"><div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><div><p className="font-semibold">{item.subject}</p><p className="mt-1 text-sm text-[#5d6d65]">{item.name} · {item.email}</p></div><Status value={item.status} /></div><p className="mt-4 rounded-xl bg-[#f6f2e9] p-4 text-sm">{item.message}</p><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => submitEnquiry(e, item, act)}><label className="grid gap-2 text-sm font-semibold">Status<select name="status" defaultValue={item.status} className="field"><option value={item.status}>{item.status}</option>{enquiryTransitions[item.status]?.map((value) => <option key={value}>{value}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold">Assigned administrator<select name="assigned_to" defaultValue={item.assigned_to ?? ""} className="field"><option value="">Unassigned</option>{admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.full_name || "Administrator"}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold sm:col-span-2">Internal notes<textarea name="admin_notes" defaultValue={item.admin_notes ?? ""} maxLength={5000} rows={3} className="field" /></label><button disabled={pending === item.id} className="w-fit rounded-full bg-[#17352d] px-5 py-2.5 font-bold text-white">Save enquiry</button></form></article>)}
        <Pagination page={enquiries.page} pages={enquiries.pages} kind="enquiry" />
      </Queue>
    </div>
  );
}

function submitEnquiry(event: FormEvent<HTMLFormElement>, item: AdminEnquiryList["items"][number], act: (id: string, action: (token: string) => Promise<unknown>) => Promise<void>) { event.preventDefault(); const form = new FormData(event.currentTarget); void act(item.id, (accessToken) => updateAdminEnquiry(item.id, { status: String(form.get("status")), assigned_to: String(form.get("assigned_to")) || null, admin_notes: String(form.get("admin_notes")) || null }, accessToken)); }
function Queue({ title, total, kind, statuses, children }: { title: string; total: number; kind: string; statuses: string[]; children: React.ReactNode }) { return <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-8"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="eyebrow text-[#947039]">Operations queue</p><h2 className="mt-2 font-heading text-4xl">{title} <span className="text-2xl text-[#7d8a82]">({total})</span></h2></div><form className="grid gap-2 sm:grid-cols-[1fr_170px_auto]"><input name={`${kind}_q`} placeholder={`Search ${title.toLowerCase()}`} className="field" /><select name={`${kind}_status`} className="field"><option value="">All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select><button className="rounded-full border px-5 py-2 font-semibold">Search</button></form></div><div className="mt-6">{children}</div></section>; }
function Status({ value }: { value: string }) { return <span className="h-fit w-fit rounded-full bg-[#dfe7dd] px-3 py-1 text-xs font-bold capitalize">{value.replace("_", " ")}</span>; }
function Empty() { return <p className="rounded-xl bg-[#f6f2e9] p-5 text-sm text-[#5d6d65]">Nothing matches this queue.</p>; }
function Pagination({ page, pages, kind }: { page: number; pages: number; kind: string }) { if (pages <= 1) return null; return <div className="flex gap-3 border-t pt-5">{page > 1 && <a href={`?${kind}_page=${page - 1}`} className="underline">Previous</a>}<span className="text-sm">Page {page} of {pages}</span>{page < pages && <a href={`?${kind}_page=${page + 1}`} className="underline">Next</a>}</div>; }
