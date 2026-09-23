import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/account?message=Administrator+access+is+required.");

  return (
    <div className="admin-shell min-h-screen bg-neutral-100 text-neutral-950 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="border-b border-neutral-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col px-4 py-4 lg:px-5 lg:py-6">
          <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-4 lg:block lg:pb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">Aurelia House</p>
              <p className="mt-1 text-lg font-semibold tracking-tight">Admin console</p>
            </div>
            <span className="border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs font-semibold text-neutral-600">LIVE</span>
          </div>

          <div className="mt-4 overflow-x-auto lg:mt-6 lg:overflow-visible">
            <AdminSidebarNav />
          </div>

          <div className="mt-auto hidden border-t border-neutral-200 pt-5 lg:block">
            <p className="truncate text-sm font-semibold">{user.email || "Administrator"}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-neutral-500">Administrator access</p>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex min-h-14 items-center justify-between border-b border-neutral-200 bg-white px-5 sm:px-8">
          <p className="text-sm font-medium text-neutral-500">Hotel operations</p>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Light workspace</p>
        </header>
        {children}
      </div>
    </div>
  );
}
