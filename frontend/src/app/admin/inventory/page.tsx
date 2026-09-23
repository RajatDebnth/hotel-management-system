import { redirect } from "next/navigation";

import { InventoryManager } from "@/components/admin/inventory-manager";
import { getAdminInventory } from "@/lib/api";
import { getSessionCookieHeader } from "@/lib/auth/session";

export default async function AdminInventoryPage() {
  const cookie = await getSessionCookieHeader();
  if (!cookie) redirect("/login?next=/admin/inventory");
  const inventory = await getAdminInventory({ cookie });
  return (
    <main className="admin-page">
      <header className="border-b border-neutral-300 pb-7">
        <p className="admin-kicker">Inventory</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Rooms and amenities</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-500">Manage room types, physical rooms, facilities, and catalog photography.</p>
      </header>
      <div className="mt-8"><InventoryManager inventory={inventory} /></div>
    </main>
  );
}
