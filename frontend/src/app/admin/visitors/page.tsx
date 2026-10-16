import { redirect } from "next/navigation";

import { VisitorManager } from "@/components/admin/visitor-manager";
import { getAdminVisitors } from "@/lib/api";
import { getSessionCookieHeader } from "@/lib/auth/session";

export default async function VisitorsPage() {
  const cookie = await getSessionCookieHeader();
  if (!cookie) redirect("/login?next=/admin/visitors");
  const visitors = await getAdminVisitors({ cookie });

  return (
    <main className="admin-page">
      <header className="border-b border-neutral-300 pb-7">
        <p className="admin-kicker">Guest records</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Visitors</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-500">Review unique visitor profiles and their reservation history. Visitor records are read-only in this workspace.</p>
      </header>
      <div className="mt-8"><VisitorManager visitors={visitors} /></div>
    </main>
  );
}
