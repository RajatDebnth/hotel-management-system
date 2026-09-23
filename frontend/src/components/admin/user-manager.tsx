"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminUser } from "@/lib/api";
import { updateAdminUserRole } from "@/lib/api";

export function UserManager({ users, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");

  async function changeRole(user: AdminUser) {
    setPending(user.id);
    setMessage("");
    try {
      await updateAdminUserRole(user.id, user.role === "admin" ? "customer" : "admin");
      setMessage(`${user.full_name}'s role was updated.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The role could not be updated.");
    } finally {
      setPending("");
    }
  }

  return (
    <section className="admin-panel">
      {message && <p className="border-b border-neutral-200 bg-neutral-50 p-4 text-sm" role="status">{message}</p>}
      <div className="divide-y divide-neutral-200">
        {users.map((user) => {
          const isCurrent = user.id === currentUserId;
          return (
            <article key={user.id} className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{user.full_name}</p>
                  {isCurrent && <span className="border border-neutral-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">You</span>}
                </div>
                <p className="mt-1 text-sm text-neutral-500">{user.email}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-neutral-600">{user.role} · {user.is_active ? "active" : "inactive"}</p>
              </div>
              <button className="admin-secondary-button" disabled={isCurrent || pending === user.id} onClick={() => changeRole(user)}>
                {pending === user.id ? "Updating…" : user.role === "admin" ? "Make customer" : "Make administrator"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
