import Link from "next/link";
import { redirect } from "next/navigation";

import { BookingForm } from "@/components/booking/booking-form";
import { getRoom } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ check_in?: string; check_out?: string; guests?: string }>;
};

export const dynamic = "force-dynamic";

export default async function BookRoom({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/book/${encodeURIComponent(slug)}`);
  const room = await getRoom(slug);

  return (
    <main className="min-h-screen bg-[#f6f2e9] py-10 sm:py-16">
      <div className="site-container">
        <Link href={`/rooms/${room.slug}`} className="text-sm font-semibold">← Back to room details</Link>
        <div className="mt-7">
          <BookingForm
            categoryId={room.id}
            categoryName={room.name}
            maxGuests={room.max_guests}
            pricePerNight={Number(room.base_price)}
            email={user.email ?? ""}
            initialCheckIn={query.check_in}
            initialCheckOut={query.check_out}
            initialGuests={query.guests ? Number(query.guests) : undefined}
          />
        </div>
      </div>
    </main>
  );
}
