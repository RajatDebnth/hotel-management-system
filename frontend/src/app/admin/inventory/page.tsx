import { redirect } from "next/navigation";

import { InventoryManager } from "@/components/admin/inventory-manager";
import { getAdminInventory } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

export default async function AdminInventoryPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) redirect("/login?next=/admin/inventory");
  const inventory = await getAdminInventory(data.session.access_token);
  return <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14"><p className="eyebrow text-[#947039]">Administrator</p><h1 className="mt-2 font-heading text-5xl">Inventory studio</h1><p className="mt-3 text-[#5d6d65]">Manage room types, physical rooms, facilities, and catalog photography.</p><div className="mt-10"><InventoryManager inventory={inventory} /></div></main>;
}
