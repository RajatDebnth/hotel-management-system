import { redirect } from "next/navigation";

import { UserManager } from "@/components/admin/user-manager";
import { getAdminUsers } from "@/lib/api";
import { getCurrentUser, getSessionCookieHeader } from "@/lib/auth/session";

export default async function AdminUsersPage() {
  const [user, cookie] = await Promise.all([getCurrentUser(true), getSessionCookieHeader()]);
  if (!user || !cookie) redirect("/login?next=/admin/users");
  const users = await getAdminUsers({ cookie });
  return (
    <main className="admin-page">
      <header className="border-b border-neutral-300 pb-7">
        <p className="admin-kicker">Access</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Users and administrators</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-500">Visitor accounts remain visitor-only. Create a separate account whenever a staff member needs administrator access.</p>
      </header>
      <div className="mt-8"><UserManager users={users} currentUserId={user.id} /></div>
    </main>
  );
}
