import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { signOut } from "@/app/auth/actions";
import { AccountNav } from "@/components/account/account-nav";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  if (user.role !== "customer") redirect("/admin?message=Customer+accounts+are+restricted+to+visitors.");

  return (
    <div className="min-h-screen bg-[#F3F1EB] text-[#132A46]">
      <header className="border-b border-[#D9DEE5] bg-[#F8F7F3]">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/" className="font-heading text-lg font-semibold uppercase tracking-[0.12em]">
            Aurelia <span className="text-[#A9782F]">House</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4" aria-label="Account shortcuts">
            <Link href="/" className="hidden text-sm font-semibold text-[#405066] hover:text-[#132A46] sm:block">Hotel home</Link>
            <Link href="/rooms" className="text-sm font-semibold text-[#405066] hover:text-[#132A46]">Book a stay</Link>
            <form action={signOut}><Button type="submit" variant="outline" size="sm">Sign out</Button></form>
          </nav>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1240px] gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-10 lg:py-10">
        <aside className="min-w-0">
          <div className="mb-3 lg:mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A06F29]">Customer account</p>
            <p className="mt-1 truncate text-sm text-[#5F6875]">{user.email}</p>
          </div>
          <div className="overflow-x-auto pb-1 lg:overflow-visible"><AccountNav /></div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
