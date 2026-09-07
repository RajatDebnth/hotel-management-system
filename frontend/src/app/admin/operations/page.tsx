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
  return <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14"><p className="eyebrow text-[#947039]">Administrator</p><h1 className="mt-2 font-heading text-5xl">Guest operations</h1><p className="mt-3 text-[#5d6d65]">Review reservations and respond to customer enquiries with an auditable workflow.</p><div className="mt-10"><OperationsManager bookings={bookings} enquiries={enquiries} admins={admins} /></div></main>;
}
