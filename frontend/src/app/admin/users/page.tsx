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
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Users and roles</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-500">Promote trusted staff to administrator or return them to customer access. Your own role cannot be changed here.</p>
      </header>
      <div className="mt-8"><UserManager users={users} currentUserId={user.id} /></div>
    </main>
  );
}
