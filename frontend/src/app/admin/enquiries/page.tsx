import { redirect } from "next/navigation";

import { EnquiryManager } from "@/components/admin/enquiry-manager";
import { getAdminEnquiries, getAdminOptions } from "@/lib/api";
import { getSessionCookieHeader } from "@/lib/auth/session";

type Search = { enquiry_page?: string; enquiry_q?: string; enquiry_status?: string };

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const query = await searchParams;
  const cookie = await getSessionCookieHeader();
  if (!cookie) redirect("/login?next=/admin/enquiries");
  const [enquiries, admins] = await Promise.all([
    getAdminEnquiries(
      { page: Number(query.enquiry_page) || 1, query: query.enquiry_q, status: query.enquiry_status },
      { cookie },
    ),
    getAdminOptions({ cookie }),
  ]);

  return (
    <main className="admin-page">
      <header className="border-b border-neutral-300 pb-7">
        <p className="admin-kicker">Front desk</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Enquiries</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-500">Respond to customer questions, assign ownership, and track each enquiry to resolution.</p>
      </header>
      <div className="mt-8"><EnquiryManager enquiries={enquiries} admins={admins} /></div>
    </main>
  );
}
