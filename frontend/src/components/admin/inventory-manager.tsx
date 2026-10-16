"use client";

import Image from "next/image";
import { Plus, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

import type { AdminInventory } from "@/lib/api";
import { deleteAdminRecord, saveAdminRecord, updateAdminImage, uploadAdminImage } from "@/lib/api";

type Kind = "facilities" | "categories" | "rooms";
type Modal = { kind: Kind; id?: string };
type Submit = (payload: Record<string, unknown>) => void;
const input = "field";

export function InventoryManager({ inventory }: { inventory: AdminInventory }) {
  const router = useRouter();
  const [tab, setTab] = useState<Kind>("facilities");
  const [modal, setModal] = useState<Modal | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function act(action: () => Promise<unknown>, success: string, close = true) {
    setPending(true); setMessage("");
    try { await action(); if (close) setModal(null); setMessage(success); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Inventory update failed."); }
    finally { setPending(false); }
  }

  async function remove(kind: Kind | "images", id: string, label: string) {
    if (!globalThis.confirm(`Delete ${label}? This is only allowed when it is not in use.`)) return;
    await act(() => deleteAdminRecord(kind, id), `${label} deleted.`, kind !== "images");
  }

  function openOnKey(event: KeyboardEvent<HTMLTableRowElement>, next: Modal) {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setModal(next); }
  }

  const category = modal?.kind === "categories" ? inventory.categories.find((item) => item.id === modal.id) : undefined;
  const room = modal?.kind === "rooms" ? inventory.rooms.find((item) => item.id === modal.id) : undefined;
  const facility = modal?.kind === "facilities" ? inventory.facilities.find((item) => item.id === modal.id) : undefined;

  return <>
    <div className="flex overflow-x-auto border-b border-neutral-300" role="tablist" aria-label="Inventory sections">
      {(["facilities", "categories", "rooms"] as const).map((item) => <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`min-h-11 border-t border-r border-neutral-300 px-5 text-sm font-semibold transition-colors first:border-l ${tab === item ? "bg-neutral-950 text-white" : "bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"}`}>{item === "categories" ? "Room categories" : title(item)}</button>)}
    </div>
    {message && <p className="mt-4 border border-neutral-300 bg-white p-3 text-sm" role="status">{message}</p>}
    <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-neutral-300 pb-5">
      <div><p className="admin-kicker">Inventory register</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{tab === "categories" ? "Room categories" : title(tab)}</h2><p className="mt-2 text-sm text-neutral-500">Select any table row to view and edit its details.</p></div>
      <button onClick={() => setModal({ kind: tab })} className="admin-primary-button flex items-center gap-2"><Plus className="size-4" aria-hidden="true" />Add {tab === "categories" ? "category" : tab.slice(0, -1)}</button>
    </div>
    {tab === "facilities" && <FacilityTable inventory={inventory} open={(id) => setModal({ kind: "facilities", id })} openOnKey={openOnKey} remove={remove} />}
    {tab === "categories" && <CategoryTable inventory={inventory} open={(id) => setModal({ kind: "categories", id })} openOnKey={openOnKey} remove={remove} />}
    {tab === "rooms" && <RoomTables inventory={inventory} open={(id) => setModal({ kind: "rooms", id })} openOnKey={openOnKey} remove={remove} />}

    {modal && <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><section role="dialog" aria-modal="true" aria-labelledby="inventory-dialog-title" className="max-h-[92vh] w-full max-w-5xl overflow-y-auto border border-neutral-950 bg-white shadow-2xl"><header className="flex items-start justify-between gap-5 border-b border-neutral-300 p-5 sm:p-6"><div><p className="admin-kicker">Inventory editor</p><h2 id="inventory-dialog-title" className="mt-2 text-2xl font-semibold tracking-tight">{modal.id ? "Edit" : "Add"} {modal.kind === "categories" ? "room category" : modal.kind.slice(0, -1)}</h2></div><button type="button" onClick={() => setModal(null)} aria-label="Close inventory editor" className="grid size-10 place-items-center border border-neutral-300 text-neutral-600 hover:border-neutral-950 hover:text-neutral-950"><X className="size-5" aria-hidden="true" /></button></header><div className="p-5 sm:p-6">
      {modal.kind === "facilities" && <FacilityForm item={facility} pending={pending} submit={(payload) => void act(() => saveAdminRecord("facilities", payload, modal.id), "Facility saved.")} />}
      {modal.kind === "categories" && <CategoryForm item={category} facilities={inventory.facilities} pending={pending} submit={(payload) => void act(() => saveAdminRecord("categories", payload, modal.id), "Room category saved.")} />}
      {modal.kind === "rooms" && <RoomEditor item={room} inventory={inventory} pending={pending} submit={(payload) => void act(() => saveAdminRecord("rooms", payload, modal.id), "Room saved.")} act={act} remove={remove} />}
    </div></section></div>}
  </>;
}

type TableProps = { inventory: AdminInventory; open: (id: string) => void; openOnKey: (event: KeyboardEvent<HTMLTableRowElement>, modal: Modal) => void; remove: (kind: Kind | "images", id: string, label: string) => Promise<void> };

function FacilityTable({ inventory, open, openOnKey, remove }: TableProps) {
  return <Table headings={["Facility", "Description", "Icon", "Room categories", "Status", "Action"]}>{inventory.facilities.map((item) => <tr key={item.id} tabIndex={0} onClick={() => open(item.id)} onKeyDown={(event) => openOnKey(event, { kind: "facilities", id: item.id })} className={rowClass}><td className={primaryCell}>{item.name}</td><td className={bodyCell}>{item.description || "—"}</td><td className={bodyCell}>{item.icon || "—"}</td><td className={bodyCell}>{inventory.categories.filter((category) => (category.facility_ids ?? []).includes(item.id)).length}</td><td className={bodyCell}><Status value={item.is_active ? "active" : "inactive"} /></td><ActionCell edit={() => open(item.id)} remove={() => void remove("facilities", item.id, item.name)} /></tr>)}</Table>;
}

function CategoryTable({ inventory, open, openOnKey, remove }: TableProps) {
  return <Table headings={["Category", "Price / night", "Capacity", "Bed", "Size", "Facilities", "Rooms", "Status", "Action"]}>{inventory.categories.map((item) => <tr key={item.id} tabIndex={0} onClick={() => open(item.id)} onKeyDown={(event) => openOnKey(event, { kind: "categories", id: item.id })} className={rowClass}><td className={primaryCell}>{item.name}<span className="mt-1 block font-mono text-xs font-normal text-neutral-400">{item.slug}</span></td><td className={bodyCell}>{money(item.base_price)}</td><td className={bodyCell}>{item.max_guests} guests</td><td className={bodyCell}>{item.bed_type}</td><td className={bodyCell}>{item.room_size_sq_m ? `${item.room_size_sq_m} m²` : "—"}</td><td className={bodyCell}>{(item.facility_ids ?? []).length}</td><td className={bodyCell}>{inventory.rooms.filter((room) => room.category_id === item.id).length}</td><td className={bodyCell}><Status value={item.is_active ? "active" : "inactive"} /></td><ActionCell edit={() => open(item.id)} remove={() => void remove("categories", item.id, item.name)} /></tr>)}</Table>;
}

function RoomTables({ inventory, open, openOnKey, remove }: TableProps) {
  return <div className="grid gap-8 pt-6">{inventory.categories.map((category) => { const rooms = inventory.rooms.filter((room) => room.category_id === category.id); return <section key={category.id} className="admin-panel overflow-hidden"><header className="flex items-center justify-between gap-4 border-b border-neutral-300 bg-neutral-50 p-4"><div><p className="font-semibold">{category.name}</p><p className="mt-1 text-xs text-neutral-500">{rooms.length} physical room{rooms.length === 1 ? "" : "s"} · {(category.facility_ids ?? []).length} facilities</p></div><Status value={category.is_active ? "active category" : "inactive category"} /></header><Table headings={["Room number", "Floor", "Description", "Images", "Status", "Action"]} nested>{rooms.map((room) => <tr key={room.id} tabIndex={0} onClick={() => open(room.id)} onKeyDown={(event) => openOnKey(event, { kind: "rooms", id: room.id })} className={rowClass}><td className={primaryCell}>Room {room.room_number}</td><td className={bodyCell}>{room.floor ?? "—"}</td><td className={bodyCell}>{room.description || "—"}</td><td className={bodyCell}>{inventory.images.filter((image) => image.room_id === room.id).length}</td><td className={bodyCell}><Status value={room.status} /></td><ActionCell edit={() => open(room.id)} remove={() => void remove("rooms", room.id, `room ${room.room_number}`)} /></tr>)}</Table>{rooms.length === 0 && <p className="p-5 text-sm text-neutral-500">No rooms have been added to this category.</p>}</section>; })}</div>;
}

function Table({ headings, children, nested = false }: { headings: string[]; children: React.ReactNode; nested?: boolean }) {
  return <div className={nested ? "overflow-x-auto" : "admin-panel mt-6 overflow-x-auto"}><table className="w-full min-w-[900px] border-collapse text-left text-sm"><thead className="bg-neutral-100 text-[11px] uppercase tracking-[0.12em] text-neutral-500"><tr>{headings.map((heading) => <th key={heading} className="border-b border-neutral-300 px-4 py-3 font-bold">{heading}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function ActionCell({ edit, remove }: { edit: () => void; remove: () => void }) {
  return <td className="whitespace-nowrap px-4 py-3"><div className="flex gap-2"><button type="button" className="admin-secondary-button" onClick={(event) => { event.stopPropagation(); edit(); }}>Edit</button><button type="button" className="admin-secondary-button border-neutral-950" onClick={(event) => { event.stopPropagation(); remove(); }}>Delete</button></div></td>;
}

function FacilityForm({ item, pending, submit }: { item?: AdminInventory["facilities"][number]; pending: boolean; submit: Submit }) {
  return <JsonForm pending={pending} onSubmit={(form) => submit({ name: form.get("name"), icon: form.get("icon") || null, description: form.get("description"), is_active: form.get("is_active") === "on" })}><div className="grid gap-4 sm:grid-cols-2"><Field name="name" label="Facility name" value={item?.name} required /><Field name="icon" label="Icon name" value={item?.icon ?? ""} /><div className="sm:col-span-2"><TextArea name="description" label="Description" value={item?.description} /></div><Check name="is_active" label="Facility is active" checked={item?.is_active ?? true} /></div></JsonForm>;
}

function CategoryForm({ item, facilities, pending, submit }: { item?: AdminInventory["categories"][number]; facilities: AdminInventory["facilities"]; pending: boolean; submit: Submit }) {
  return <JsonForm pending={pending} onSubmit={(form) => submit({ name: form.get("name"), slug: form.get("slug"), description: form.get("description"), base_price: Number(form.get("base_price")), max_guests: Number(form.get("max_guests")), bed_type: form.get("bed_type"), room_size_sq_m: form.get("room_size_sq_m") ? Number(form.get("room_size_sq_m")) : null, is_active: form.get("is_active") === "on", facility_ids: form.getAll("facility_ids") })}><div className="grid gap-4 sm:grid-cols-2"><Field name="name" label="Category name" value={item?.name} required /><Field name="slug" label="URL slug" value={item?.slug} required /><div className="sm:col-span-2"><TextArea name="description" label="Description" value={item?.description} /></div><Field name="base_price" label="Nightly price" value={item?.base_price} type="number" required /><Field name="max_guests" label="Maximum guests" value={item?.max_guests} type="number" required /><Field name="bed_type" label="Bed type" value={item?.bed_type} required /><Field name="room_size_sq_m" label="Size (m²)" value={item?.room_size_sq_m ?? ""} type="number" /><Check name="is_active" label="Category is active" checked={item?.is_active ?? true} /><fieldset className="sm:col-span-2"><legend className="text-sm font-semibold">Included facilities</legend><p className="mt-1 text-xs text-neutral-500">Define facilities first, then assign them to this category.</p><div className="mt-3 grid gap-2 border border-neutral-300 p-4 sm:grid-cols-2 lg:grid-cols-3">{facilities.map((facility) => <Check key={facility.id} name="facility_ids" value={facility.id} label={facility.name} checked={(item?.facility_ids ?? []).includes(facility.id)} />)}{facilities.length === 0 && <p className="text-sm text-neutral-500">No facilities have been defined.</p>}</div></fieldset></div></JsonForm>;
}

function RoomEditor({ item, inventory, pending, submit, act, remove }: { item?: AdminInventory["rooms"][number]; inventory: AdminInventory; pending: boolean; submit: Submit; act: (action: () => Promise<unknown>, success: string, close?: boolean) => Promise<void>; remove: (kind: Kind | "images", id: string, label: string) => Promise<void> }) {
  const images = item ? inventory.images.filter((image) => image.room_id === item.id) : [];
  return <div className="grid gap-8"><JsonForm pending={pending} onSubmit={(form) => submit({ room_number: form.get("room_number"), category_id: form.get("category_id"), floor: form.get("floor") ? Number(form.get("floor")) : null, description: form.get("description"), status: form.get("status") })}><div className="grid gap-4 sm:grid-cols-2"><Field name="room_number" label="Room number" value={item?.room_number} required /><label className="grid gap-2 text-sm font-semibold">Room category<select name="category_id" defaultValue={item?.category_id} className={input}>{inventory.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><Field name="floor" label="Floor" value={item?.floor ?? ""} type="number" /><label className="grid gap-2 text-sm font-semibold">Status<select name="status" defaultValue={item?.status ?? "active"} className={input}><option value="active">Active</option><option value="maintenance">Maintenance</option><option value="inactive">Inactive</option></select></label><div className="sm:col-span-2"><TextArea name="description" label="Room description" value={item?.description} /></div></div></JsonForm>
    {item ? <RoomImages room={item} images={images} pending={pending} act={act} remove={remove} /> : <p className="border border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">Save the room first, then reopen it to add room-specific images.</p>}
  </div>;
}

function RoomImages({ room, images, pending, act, remove }: { room: AdminInventory["rooms"][number]; images: AdminInventory["images"]; pending: boolean; act: (action: () => Promise<unknown>, success: string, close?: boolean) => Promise<void>; remove: (kind: Kind | "images", id: string, label: string) => Promise<void> }) {
  return <section className="border-t border-neutral-300 pt-7"><p className="admin-kicker">Room photography</p><h3 className="mt-2 text-xl font-semibold">Images for room {room.room_number}</h3><p className="mt-2 text-sm text-neutral-500">Images are attached to this physical room under {room.category_name}.</p><form className="mt-5 grid gap-3 border border-neutral-300 bg-neutral-50 p-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); form.set("room_id", room.id); void act(() => uploadAdminImage(form), "Room image uploaded.", false); }}><Field name="alt_text" label="Alternative text" required /><Field name="sort_order" label="Display order" value="0" type="number" required /><label className="grid gap-2 text-sm font-semibold sm:col-span-2">Image file<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required className={input} /></label><Check name="is_cover" label="Use as room cover" /><button disabled={pending} className="admin-primary-button sm:col-span-2">{pending ? "Uploading…" : "Upload room image"}</button></form><div className="mt-5 grid gap-4">{images.map((image) => <form key={image.id} className="grid gap-3 border border-neutral-300 p-3 sm:grid-cols-[128px_1fr_auto] sm:items-start" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void act(() => updateAdminImage(image.id, { alt_text: String(form.get("alt_text")), sort_order: Number(form.get("sort_order")), is_cover: form.get("is_cover") === "on" }), "Image details saved.", false); }}><Image unoptimized src={image.url} alt={image.alt_text} width={128} height={88} className="h-24 w-32 border border-neutral-200 object-cover" /><div className="grid gap-2 sm:grid-cols-2"><Field name="alt_text" label="Alternative text" value={image.alt_text} required /><Field name="sort_order" label="Order" value={image.sort_order} type="number" required /><Check name="is_cover" label="Room cover" checked={image.is_cover} /></div><div className="grid gap-2"><button disabled={pending} className="admin-secondary-button">Save image</button><button type="button" onClick={() => void remove("images", image.id, "this room image")} className="admin-secondary-button border-neutral-950">Delete image</button></div></form>)}{images.length === 0 && <p className="border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">No room-specific images have been uploaded.</p>}</div></section>;
}

function JsonForm({ children, onSubmit, pending }: { children: React.ReactNode; onSubmit: (form: FormData) => void; pending: boolean }) {
  return <form className="grid gap-5" onSubmit={(event) => { event.preventDefault(); onSubmit(new FormData(event.currentTarget)); }}>{children}<button disabled={pending} className="admin-primary-button w-fit">{pending ? "Saving…" : "Save changes"}</button></form>;
}

function Field({ name, label, value, type = "text", required = false }: { name: string; label: string; value?: string | number; type?: string; required?: boolean }) {
  return <label className="grid gap-2 text-sm font-semibold">{label}<input name={name} defaultValue={value} type={type} required={required} min={type === "number" ? 0 : undefined} step={type === "number" ? "0.01" : undefined} className={input} /></label>;
}
function TextArea({ name, label, value }: { name: string; label: string; value?: string }) { return <label className="grid gap-2 text-sm font-semibold">{label}<textarea name={name} defaultValue={value} rows={4} className={input} /></label>; }
function Check({ name, label, value, checked = false }: { name: string; label: string; value?: string; checked?: boolean }) { return <label className="flex items-center gap-3 text-sm font-semibold"><input name={name} value={value} type="checkbox" defaultChecked={checked} className="size-4" />{label}</label>; }
function Status({ value }: { value: string }) { return <span className="inline-flex whitespace-nowrap border border-neutral-300 bg-neutral-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-700">{value.replace("_", " ")}</span>; }
function money(value: string | number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value)); }
function title(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }

const rowClass = "cursor-pointer border-b border-neutral-200 bg-white transition-colors last:border-b-0 hover:bg-neutral-50 focus:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-950";
const primaryCell = "px-4 py-4 font-semibold text-neutral-950";
const bodyCell = "px-4 py-4 text-neutral-600";
