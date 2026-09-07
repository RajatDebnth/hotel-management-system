"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminInventory } from "@/lib/api";
import {
  deleteAdminRecord,
  saveAdminRecord,
  updateAdminImage,
  uploadAdminImage,
} from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

type Kind = "categories" | "rooms" | "facilities";

export function InventoryManager({ inventory }: { inventory: AdminInventory }) {
  const router = useRouter();
  const [tab, setTab] = useState<Kind | "images">("categories");
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function token() {
    const { data } = await createClient().auth.getSession();
    if (!data.session) throw new Error("Your session expired. Please sign in again.");
    return data.session.access_token;
  }

  async function act(action: (accessToken: string) => Promise<unknown>) {
    setPending(true); setMessage("");
    try {
      await action(await token());
      setEditing(null); setMessage("Inventory updated."); router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Inventory update failed.");
    } finally { setPending(false); }
  }

  async function remove(kind: Kind | "images", id: string) {
    await act((accessToken) => deleteAdminRecord(kind, id, accessToken));
  }

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist">
        {(["categories", "rooms", "facilities", "images"] as const).map((item) => <button key={item} onClick={() => { setTab(item); setEditing(null); }} className={`rounded-full px-5 py-2.5 text-sm font-bold capitalize ${tab === item ? "bg-[#17352d] text-white" : "bg-white"}`}>{item}</button>)}
      </div>
      {message && <p className="mt-4 rounded-xl bg-white p-3 text-sm" role="status">{message}</p>}
      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="h-fit rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="font-heading text-3xl">{editing ? "Edit" : "Add"} {tab.slice(0, -1)}</h2>
          {tab === "categories" && <CategoryForm key={editing ?? "new"} item={inventory.categories.find((x) => x.id === editing)} pending={pending} submit={(payload) => act((accessToken) => saveAdminRecord("categories", payload, accessToken, editing ?? undefined))} />}
          {tab === "rooms" && <RoomForm key={editing ?? "new"} item={inventory.rooms.find((x) => x.id === editing)} categories={inventory.categories} pending={pending} submit={(payload) => act((accessToken) => saveAdminRecord("rooms", payload, accessToken, editing ?? undefined))} />}
          {tab === "facilities" && <FacilityForm key={editing ?? "new"} item={inventory.facilities.find((x) => x.id === editing)} pending={pending} submit={(payload) => act((accessToken) => saveAdminRecord("facilities", payload, accessToken, editing ?? undefined))} />}
          {tab === "images" && <ImageForm categories={inventory.categories} pending={pending} submit={(form) => act((accessToken) => uploadAdminImage(form, accessToken))} />}
          {editing && <button onClick={() => setEditing(null)} className="mt-3 text-sm underline">Cancel editing</button>}
        </section>
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="font-heading text-3xl capitalize">{tab}</h2>
          <div className="mt-5 divide-y">
            {tab === "categories" && inventory.categories.map((item) => <Row key={item.id} title={item.name} detail={`${item.slug} · ₹${Number(item.base_price).toLocaleString("en-IN")} · ${item.max_guests} guests${item.is_active ? "" : " · inactive"}`} edit={() => setEditing(item.id)} remove={() => remove(tab, item.id)} />)}
            {tab === "rooms" && inventory.rooms.map((item) => <Row key={item.id} title={`Room ${item.room_number}`} detail={`${item.category_name} · ${item.status}${item.floor === null ? "" : ` · floor ${item.floor}`}`} edit={() => setEditing(item.id)} remove={() => remove(tab, item.id)} />)}
            {tab === "facilities" && inventory.facilities.map((item) => <Row key={item.id} title={item.name} detail={`${item.icon ?? "No icon"}${item.is_active ? "" : " · inactive"}`} edit={() => setEditing(item.id)} remove={() => remove(tab, item.id)} />)}
            {tab === "images" && inventory.images.map((item) => <div key={item.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center"><Image unoptimized src={item.url} alt={item.alt_text} width={144} height={96} className="h-24 w-36 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="font-semibold">{item.alt_text}</p><p className="mt-1 truncate text-xs text-[#5d6d65]">Order {item.sort_order}{item.is_cover ? " · Cover" : ""}</p></div><div className="flex gap-3">{!item.is_cover && <button onClick={() => act((accessToken) => updateAdminImage(item.id, { alt_text: item.alt_text, sort_order: item.sort_order, is_cover: true }, accessToken))} className="text-sm font-semibold underline">Set cover</button>}<button onClick={() => remove(tab, item.id)} className="text-sm font-semibold text-red-700">Delete</button></div></div>)}
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ title, detail, edit, remove }: { title: string; detail: string; edit: () => void; remove: () => void }) {
  return <div className="flex items-center justify-between gap-4 py-5"><div><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-[#5d6d65]">{detail}</p></div><div className="flex gap-3"><button onClick={edit} className="text-sm font-semibold underline">Edit</button><button onClick={remove} className="text-sm font-semibold text-red-700">Delete</button></div></div>;
}

type Submit = (payload: Record<string, unknown>) => void;
const input = "field";
function CategoryForm({ item, pending, submit }: { item?: AdminInventory["categories"][number]; pending: boolean; submit: Submit }) {
  return <JsonForm pending={pending} onSubmit={(f) => submit({ name: f.get("name"), slug: f.get("slug"), description: f.get("description"), base_price: Number(f.get("base_price")), max_guests: Number(f.get("max_guests")), bed_type: f.get("bed_type"), room_size_sq_m: f.get("room_size_sq_m") ? Number(f.get("room_size_sq_m")) : null, is_active: f.get("is_active") === "on" })}><Field name="name" label="Name" value={item?.name} required /><Field name="slug" label="Slug" value={item?.slug} required /><Field name="description" label="Description" value={item?.description} /><Field name="base_price" label="Nightly price" value={item?.base_price} type="number" required /><Field name="max_guests" label="Maximum guests" value={item?.max_guests} type="number" required /><Field name="bed_type" label="Bed type" value={item?.bed_type} required /><Field name="room_size_sq_m" label="Size (m²)" value={item?.room_size_sq_m ?? ""} type="number" /><Check name="is_active" label="Active" checked={item?.is_active ?? true} /></JsonForm>;
}
function RoomForm({ item, categories, pending, submit }: { item?: AdminInventory["rooms"][number]; categories: AdminInventory["categories"]; pending: boolean; submit: Submit }) {
  return <JsonForm pending={pending} onSubmit={(f) => submit({ room_number: f.get("room_number"), category_id: f.get("category_id"), floor: f.get("floor") ? Number(f.get("floor")) : null, description: f.get("description"), status: f.get("status") })}><Field name="room_number" label="Room number" value={item?.room_number} required /><label className="grid gap-2 text-sm font-semibold">Category<select name="category_id" defaultValue={item?.category_id} className={input}>{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><Field name="floor" label="Floor" value={item?.floor ?? ""} type="number" /><Field name="description" label="Description" value={item?.description} /><label className="grid gap-2 text-sm font-semibold">Status<select name="status" defaultValue={item?.status ?? "active"} className={input}><option>active</option><option>maintenance</option><option>inactive</option></select></label></JsonForm>;
}
function FacilityForm({ item, pending, submit }: { item?: AdminInventory["facilities"][number]; pending: boolean; submit: Submit }) {
  return <JsonForm pending={pending} onSubmit={(f) => submit({ name: f.get("name"), icon: f.get("icon") || null, description: f.get("description"), is_active: f.get("is_active") === "on" })}><Field name="name" label="Name" value={item?.name} required /><Field name="icon" label="Icon name" value={item?.icon ?? ""} /><Field name="description" label="Description" value={item?.description} /><Check name="is_active" label="Active" checked={item?.is_active ?? true} /></JsonForm>;
}
function ImageForm({ categories, pending, submit }: { categories: AdminInventory["categories"]; pending: boolean; submit: (form: FormData) => void }) {
  return <form className="mt-6 grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }}><label className="grid gap-2 text-sm font-semibold">Category<select name="category_id" className={input}>{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><Field name="alt_text" label="Alternative text" required /><Field name="sort_order" label="Display order" value="0" type="number" required /><label className="grid gap-2 text-sm font-semibold">Image<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required className={input} /></label><Check name="is_cover" label="Use as cover" /><button disabled={pending} className="rounded-full bg-[#17352d] px-5 py-3 font-bold text-white">Upload image</button></form>;
}
function JsonForm({ children, onSubmit, pending }: { children: React.ReactNode; onSubmit: (form: FormData) => void; pending: boolean }) { return <form className="mt-6 grid gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }}>{children}<button disabled={pending} className="rounded-full bg-[#17352d] px-5 py-3 font-bold text-white">{pending ? "Saving…" : "Save"}</button></form>; }
function Field({ name, label, value, type = "text", required = false }: { name: string; label: string; value?: string | number; type?: string; required?: boolean }) { return <label className="grid gap-2 text-sm font-semibold">{label}<input name={name} defaultValue={value} type={type} required={required} min={type === "number" ? 0 : undefined} step={type === "number" ? "0.01" : undefined} className={input} /></label>; }
function Check({ name, label, checked = false }: { name: string; label: string; checked?: boolean }) { return <label className="flex items-center gap-3 text-sm font-semibold"><input name={name} type="checkbox" defaultChecked={checked} className="size-4" />{label}</label>; }
