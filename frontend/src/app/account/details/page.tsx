import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/account/profile-form";
import { getProfile } from "@/lib/api";
import { getSessionCookieHeader } from "@/lib/auth/session";

export default async function PersonalDetailsPage() {
  const cookie = await getSessionCookieHeader();
  if (!cookie) redirect("/login?next=/account/details");
  const profile = await getProfile({ cookie });

  return (
    <main>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A06F29]">Profile</p>
      <h1 className="mt-2 font-heading text-4xl sm:text-5xl">Personal details</h1>
      <p className="mt-3 max-w-2xl text-[#5F6875]">Keep your guest and contact information accurate so the hotel can prepare for your stay.</p>
      <div className="mt-8 max-w-3xl"><ProfileForm profile={profile} /></div>
    </main>
  );
}
