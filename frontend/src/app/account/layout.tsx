import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login?next=/account");

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-semibold">Hotel Management System</Link>
          <nav className="flex items-center gap-4">
            <Link href="/rooms" className="text-sm">Rooms</Link>
            <Link href="/account" className="text-sm">My account</Link>
            <form action={signOut}><Button type="submit" variant="outline" size="sm">Sign out</Button></form>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
