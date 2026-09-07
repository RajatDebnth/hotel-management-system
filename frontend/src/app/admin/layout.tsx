import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login?next=/admin");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (profile?.role !== "admin") redirect("/account?message=Administrator+access+is+required.");

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6"><Link href="/admin" className="font-semibold">Hotel administration</Link><nav className="flex flex-wrap gap-4"><Link href="/admin" className="text-sm underline">Dashboard</Link><Link href="/admin/inventory" className="text-sm underline">Inventory</Link><Link href="/admin/operations" className="text-sm underline">Operations</Link><Link href="/" className="text-sm underline">View hotel</Link><Link href="/account" className="text-sm underline">Customer account</Link></nav></div></header>
      {children}
    </div>
  );
}
