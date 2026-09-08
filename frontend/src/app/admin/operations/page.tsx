import { redirect } from "next/navigation";

import { OperationsManager } from "@/components/admin/operations-manager";
import { getAdminBookings, getAdminEnquiries, getAdminOptions } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

type Search = { booking_page?: string; booking_q?: string; booking_status?: string; enquiry_page?: string; enquiry_q?: string; enquiry_status?: string };

export default async function OperationsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) redirect("/login?next=/admin/operations");
  const token = data.session.access_token;
  const [bookings, enquiries, admins] = await Promise.all([
    getAdminBookings(token, { page: Number(query.booking_page) || 1, query: query.booking_q, status: query.booking_status }),
    getAdminEnquiries(token, { page: Number(query.enquiry_page) || 1, query: query.enquiry_q, status: query.enquiry_status }),
    getAdminOptions(token),
  ]);
  return (
    <main className="admin-page">
      <header className="border-b border-neutral-300 pb-7">
        <p className="admin-kicker">Operations</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Bookings and enquiries</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-500">Review reservations and respond to customer enquiries with an auditable workflow.</p>
      </header>
      <div className="mt-8"><OperationsManager bookings={bookings} enquiries={enquiries} admins={admins} /></div>
    </main>
  );
}
