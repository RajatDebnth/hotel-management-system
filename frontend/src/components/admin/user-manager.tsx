"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminUser } from "@/lib/api";
import { createAdministrator, updateAdminUserRole } from "@/lib/api";

export function UserManager({ users, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");

  const administrators = users.filter((user) => user.role === "admin");
  const visitors = users.filter((user) => user.role === "customer");

  async function addAdministrator(form: HTMLFormElement) {
    const data = new FormData(form);
    setPending("create");
    setMessage("");
    try {
      await createAdministrator({
        full_name: String(data.get("full_name")),
        email: String(data.get("email")),
        password: String(data.get("password")),
      });
      form.reset();
      setMessage("The administrator account was created.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The administrator could not be created.");
    } finally {
      setPending("");
    }
  }

  async function removeAdministrator(user: AdminUser) {
    setPending(user.id);
    setMessage("");
    try {
      await updateAdminUserRole(user.id, "customer");
      setMessage(`Administrator access was removed from ${user.full_name}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Administrator access could not be removed.");
    } finally {
      setPending("");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section className="admin-panel h-fit p-5 sm:p-6">
        <p className="admin-kicker">Administrator access</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Create administrator</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-500">Use a staff email and a new password. This creates a separate administrator account and does not change any visitor.</p>
        <form className="mt-6 grid gap-4" onSubmit={(event) => { event.preventDefault(); void addAdministrator(event.currentTarget); }}>
          <label className="grid gap-2 text-sm font-semibold">Full name<input name="full_name" required minLength={2} maxLength={120} autoComplete="name" className="field" /></label>
          <label className="grid gap-2 text-sm font-semibold">Staff email<input name="email" type="email" required autoComplete="email" className="field" /></label>
          <label className="grid gap-2 text-sm font-semibold">Temporary password<input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" className="field" /></label>
          <p className="text-xs leading-5 text-neutral-500">Use at least 12 characters. Share the password privately and ask the administrator to change it after signing in.</p>
          <button disabled={pending === "create"} className="admin-primary-button">{pending === "create" ? "Creating…" : "Create administrator"}</button>
        </form>
      </section>

      <div className="grid gap-6">
        {message && <p className="border border-neutral-300 bg-neutral-50 p-4 text-sm" role="status">{message}</p>}
        <section className="admin-panel">
          <header className="border-b border-neutral-200 p-5 sm:p-6"><p className="admin-kicker">Staff access</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Administrators <span className="font-mono text-base font-normal text-neutral-400">[{administrators.length}]</span></h2></header>
          <div className="divide-y divide-neutral-200">
            {administrators.map((user) => {
          const isCurrent = user.id === currentUserId;
          return (
            <article key={user.id} className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{user.full_name}</p>
                  {isCurrent && <span className="border border-neutral-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">You</span>}
                </div>
                <p className="mt-1 text-sm text-neutral-500">{user.email}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-neutral-600">Administrator · {user.is_active ? "active" : "inactive"}</p>
              </div>
              {!isCurrent && <button className="admin-secondary-button" disabled={pending === user.id} onClick={() => removeAdministrator(user)}>{pending === user.id ? "Updating…" : "Remove administrator access"}</button>}
            </article>
          );
        })}
          </div>
        </section>

        <section className="admin-panel">
          <header className="border-b border-neutral-200 p-5 sm:p-6"><p className="admin-kicker">Guest accounts</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Visitors <span className="font-mono text-base font-normal text-neutral-400">[{visitors.length}]</span></h2><p className="mt-2 text-sm text-neutral-500">Visitor accounts cannot be promoted to administrator.</p></header>
          <div className="divide-y divide-neutral-200">
            {visitors.map((user) => <article key={user.id} className="p-5 sm:p-6"><p className="font-semibold">{user.full_name}</p><p className="mt-1 text-sm text-neutral-500">{user.email}</p><p className="mt-2 text-xs font-bold uppercase tracking-wider text-neutral-600">Visitor · {user.is_active ? "active" : "inactive"}</p></article>)}
          </div>
        </section>
      </div>
    </div>
  );
}
