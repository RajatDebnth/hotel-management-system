import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/site/page-hero";
import { PublicShell } from "@/components/site/public-shell";
import { RoomCard } from "@/components/site/room-card";
import { getRooms } from "@/lib/api";

export const metadata: Metadata = { title: "Rooms" };
export const dynamic = "force-dynamic";

type Search = {
  page?: string; q?: string; check_in?: string; check_out?: string;
  guests?: string; min_price?: string; max_price?: string; category?: string;
};
type Props = { searchParams: Promise<Search> };
const fieldClass = "rounded-xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#17352d]/20";

function positiveNumber(value?: string) {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export default async function RoomsPage({ searchParams }: Props) {
  const filters = await searchParams;
  const page = Math.max(1, Number(filters.page) || 1);
  const query = filters.q?.trim() ?? "";
  const guests = positiveNumber(filters.guests);
  const minPrice = positiveNumber(filters.min_price);
  const maxPrice = positiveNumber(filters.max_price);
  const [catalog, completeCatalog] = await Promise.all([
    getRooms({
      page, pageSize: 6, query, checkIn: filters.check_in, checkOut: filters.check_out,
      guests, minPrice, maxPrice, category: filters.category,
    }),
    getRooms({ pageSize: 100 }),
  ]);
  const hasDates = Boolean(filters.check_in && filters.check_out);
  const activeFilters = Object.entries(filters).filter(([key, value]) => key !== "page" && value);
  const pageLink = (target: number) => {
    const params = new URLSearchParams(activeFilters as [string, string][]);
    params.set("page", String(target));
    return `/rooms?${params}`;
  };

  return (
    <PublicShell>
      <PageHero eyebrow="Rest your way" title="A room for every kind of pause." description="Search live inventory by stay dates, party size, category, and nightly price." />
      <section className="py-16 sm:py-24">
        <div className="site-container">
          <form action="/rooms" className="grid gap-4 rounded-[2rem] bg-white p-6 shadow-sm md:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-semibold">Check in<input className={`mt-2 w-full ${fieldClass}`} type="date" name="check_in" defaultValue={filters.check_in} /></label>
            <label className="text-sm font-semibold">Check out<input className={`mt-2 w-full ${fieldClass}`} type="date" name="check_out" defaultValue={filters.check_out} /></label>
            <label className="text-sm font-semibold">Guests<select className={`mt-2 w-full ${fieldClass}`} name="guests" defaultValue={filters.guests ?? ""}><option value="">Any party size</option>{[1,2,3,4,5,6].map(value => <option key={value} value={value}>{value} guest{value > 1 ? "s" : ""}</option>)}</select></label>
            <label className="text-sm font-semibold">Room type<select className={`mt-2 w-full ${fieldClass}`} name="category" defaultValue={filters.category ?? ""}><option value="">All room types</option>{completeCatalog.items.map(room => <option key={room.id} value={room.slug}>{room.name}</option>)}</select></label>
            <label className="text-sm font-semibold">Keywords<input className={`mt-2 w-full ${fieldClass}`} name="q" defaultValue={query} placeholder="King, garden…" /></label>
            <label className="text-sm font-semibold">Minimum price<input className={`mt-2 w-full ${fieldClass}`} type="number" min="0" step="100" name="min_price" defaultValue={filters.min_price} placeholder="₹0" /></label>
            <label className="text-sm font-semibold">Maximum price<input className={`mt-2 w-full ${fieldClass}`} type="number" min="0" step="100" name="max_price" defaultValue={filters.max_price} placeholder="Any price" /></label>
            <div className="flex items-end gap-2"><button className="flex-1 rounded-xl bg-[#17352d] px-5 py-3 font-semibold text-white">Search availability</button>{activeFilters.length > 0 && <Link href="/rooms" className="rounded-xl border px-4 py-3">Clear</Link>}</div>
          </form>

          <div className="mb-10 mt-14 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><p className="eyebrow text-[#947039]">{hasDates ? "Available for your stay" : "Our collection"}</p><h2 className="mt-3 font-heading text-4xl">{catalog.total} room type{catalog.total === 1 ? "" : "s"}</h2></div>
            {hasDates && <p className="text-sm text-[#68746e]">{filters.check_in} → {filters.check_out}</p>}
          </div>
          {catalog.items.length ? <div className="grid gap-7 lg:grid-cols-3">{catalog.items.map((room, index) => <RoomCard key={room.slug} room={room} index={index} />)}</div> : <div className="rounded-3xl border bg-white p-12 text-center"><h2 className="font-heading text-3xl">No rooms match this stay</h2><p className="mt-3 text-[#68746e]">Try different dates, fewer guests, or a broader price range.</p><Link href="/rooms" className="mt-6 inline-block rounded-full bg-[#17352d] px-5 py-3 text-white">Clear all filters</Link></div>}
          {catalog.pages > 1 && <nav aria-label="Room pages" className="mt-10 flex justify-center gap-3">{page > 1 && <Link className="rounded-full border px-5 py-2" href={pageLink(page - 1)}>Previous</Link>}<span className="px-3 py-2 text-sm text-[#68746e]">Page {page} of {catalog.pages}</span>{page < catalog.pages && <Link className="rounded-full border px-5 py-2" href={pageLink(page + 1)}>Next</Link>}</nav>}
        </div>
      </section>
    </PublicShell>
  );
}
