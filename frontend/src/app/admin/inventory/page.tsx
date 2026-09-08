import { redirect } from "next/navigation";

import { InventoryManager } from "@/components/admin/inventory-manager";
import { getAdminInventory } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

export default async function AdminInventoryPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) redirect("/login?next=/admin/inventory");
  const inventory = await getAdminInventory(data.session.access_token);
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
