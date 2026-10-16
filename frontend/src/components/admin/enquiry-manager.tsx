"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

import type { AdminEnquiryList, AdminOption } from "@/lib/api";
import { updateAdminEnquiry } from "@/lib/api";

type Enquiry = AdminEnquiryList["items"][number];

const enquiryTransitions: Record<string, string[]> = {
  new: ["in_progress", "resolved", "closed"],
  in_progress: ["resolved", "closed"],
  resolved: ["in_progress", "closed"],
  closed: [],
};

export function EnquiryManager({ enquiries, admins }: { enquiries: AdminEnquiryList; admins: AdminOption[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  function openEnquiry(enquiry: Enquiry) {
    setMessage("");
    setSelected(enquiry);
  }

  function handleRowKey(event: KeyboardEvent<HTMLTableRowElement>, enquiry: Enquiry) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openEnquiry(enquiry);
    }
  }

  async function saveEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    try {
      await updateAdminEnquiry(selected.id, {
        status: String(form.get("status")),
        assigned_to: String(form.get("assigned_to")) || null,
        admin_notes: String(form.get("admin_notes")) || null,
      });
      setSelected(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The enquiry could not be updated.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <section className="admin-panel overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-neutral-200 p-5 sm:p-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="admin-kicker">Customer communication register</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Enquiries <span className="font-mono text-lg font-normal text-neutral-400">[{enquiries.total}]</span>
            </h2>
          </div>
          <form className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_170px_auto]">
            <input name="enquiry_q" aria-label="Search enquiries" placeholder="Name, email, subject or message" className="field" />
            <select name="enquiry_status" aria-label="Filter enquiries by status" className="field">
              <option value="">All statuses</option>
              {["new", "in_progress", "resolved", "closed"].map((status) => <option key={status}>{status}</option>)}
            </select>
            <button className="admin-secondary-button">Search</button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
            <thead className="bg-neutral-100 text-[11px] uppercase tracking-[0.12em] text-neutral-500">
              <tr>
                {['Enquiry ID', 'Name', 'Subject', 'Email', 'Phone', 'Submitted date', 'Submitted time', 'Assigned to', 'Status'].map((heading) => (
                  <th key={heading} scope="col" className="border-b border-neutral-300 px-4 py-3 font-bold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enquiries.items.map((enquiry) => {
                const created = new Date(enquiry.created_at);
                return (
                  <tr
                    key={enquiry.id}
                    tabIndex={0}
                    aria-label={`Open enquiry from ${enquiry.name}`}
                    onClick={() => openEnquiry(enquiry)}
                    onKeyDown={(event) => handleRowKey(event, enquiry)}
                    className="cursor-pointer border-b border-neutral-200 bg-white transition-colors hover:bg-neutral-50 focus:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-950"
                  >
                    <td className="max-w-36 truncate px-4 py-4 font-mono text-xs font-semibold text-neutral-950" title={enquiry.id}>{shortId(enquiry.id)}</td>
                    <td className="px-4 py-4 font-semibold text-neutral-950">{enquiry.name}</td>
                    <td className="max-w-64 truncate px-4 py-4 text-neutral-700" title={enquiry.subject}>{enquiry.subject}</td>
                    <td className="px-4 py-4 text-neutral-600">{enquiry.email}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-neutral-600">{enquiry.phone || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-neutral-600">{formatDate(created)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-neutral-600">{formatTime(created)}</td>
                    <td className="px-4 py-4 text-neutral-600">{enquiry.assigned_name || "Unassigned"}</td>
                    <td className="px-4 py-4"><Status value={enquiry.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {enquiries.items.length === 0 && <p className="m-5 border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-500">No enquiries match this view.</p>}
        </div>

        <Pagination page={enquiries.page} pages={enquiries.pages} />
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="enquiry-dialog-title" className="max-h-[92vh] w-full max-w-4xl overflow-y-auto border border-neutral-950 bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-5 border-b border-neutral-300 p-5 sm:p-6">
              <div>
                <p className="admin-kicker">Enquiry details</p>
                <h2 id="enquiry-dialog-title" className="mt-2 text-2xl font-semibold tracking-tight">{selected.subject}</h2>
                <p className="mt-1 text-sm text-neutral-500">Received {formatDateTime(new Date(selected.created_at))}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close enquiry details" className="grid size-10 shrink-0 place-items-center border border-neutral-300 text-neutral-600 hover:border-neutral-950 hover:text-neutral-950">
                <X className="size-5" aria-hidden="true" />
              </button>
            </header>

            <div className="grid gap-8 p-5 sm:p-6 lg:grid-cols-[1fr_340px]">
              <div className="grid content-start gap-7">
                <DetailGroup title="Customer" items={[
                  ["Name", selected.name], ["Email", selected.email], ["Phone", selected.phone || "Not provided"], ["Account", selected.user_id ? "Registered visitor" : "Public visitor"],
                ]} />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">Customer message</h3>
                  <p className="mt-3 whitespace-pre-wrap border-l-2 border-neutral-950 bg-neutral-50 p-4 text-sm leading-7 text-neutral-700">{selected.message}</p>
                </div>
                <DetailGroup title="Record" items={[
                  ["Enquiry ID", selected.id], ["Created", formatDateTime(new Date(selected.created_at))],
                  ["Last updated", formatDateTime(new Date(selected.updated_at))], ["Assigned administrator", selected.assigned_name || "Unassigned"],
                ]} />
              </div>

              <aside className="h-fit border border-neutral-300 bg-neutral-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Manage enquiry</h3>
                  <Status value={selected.status} />
                </div>
                <form className="mt-5 grid gap-4" onSubmit={saveEnquiry}>
                  <label className="grid gap-2 text-sm font-semibold">Status
                    <select name="status" defaultValue={selected.status} className="field">
                      <option value={selected.status}>{selected.status.replace("_", " ")}</option>
                      {enquiryTransitions[selected.status].map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">Assigned administrator
                    <select name="assigned_to" defaultValue={selected.assigned_to ?? ""} className="field">
                      <option value="">Unassigned</option>
                      {admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.full_name || "Administrator"}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">Internal message / update note
                    <textarea name="admin_notes" defaultValue={selected.admin_notes ?? ""} maxLength={5000} rows={6} className="field" placeholder="Record the response, follow-up, or resolution details." />
                  </label>
                  {message && <p className="border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{message}</p>}
                  <button disabled={pending} className="admin-primary-button">{pending ? "Saving…" : "Save enquiry update"}</button>
                </form>
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
  return <div className="flex items-center gap-3 p-5">{page > 1 && <a href={`?enquiry_page=${page - 1}`} className="admin-secondary-button">Previous</a>}<span className="text-sm text-neutral-500">Page {page} of {pages}</span>{page < pages && <a href={`?enquiry_page=${page + 1}`} className="admin-secondary-button">Next</a>}</div>;
}

function shortId(value: string) { return value.split("-")[0].toUpperCase(); }
function formatDate(value: Date) { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(value); }
function formatTime(value: Date) { return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(value); }
function formatDateTime(value: Date) { return `${formatDate(value)} at ${formatTime(value)}`; }
