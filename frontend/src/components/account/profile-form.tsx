"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { Profile } from "@/lib/api";
import { updateProfile } from "@/lib/api";

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await updateProfile({
        full_name: String(form.get("full_name")),
        phone: String(form.get("phone")) || null,
      });
      setMessage("Profile saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profile could not be saved.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-[#D9DEE5] bg-white p-6 sm:p-8">
      <h2 className="text-2xl font-semibold">Guest information</h2>
      <p className="mt-2 text-sm text-[#5F6875]">The hotel uses these details for reservation communication.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2"><span className="text-sm font-semibold">Full name</span><input name="full_name" defaultValue={profile.full_name} required minLength={2} maxLength={120} autoComplete="name" className="field" /></label>
        <label className="grid gap-2"><span className="text-sm font-semibold">Phone</span><input name="phone" defaultValue={profile.phone ?? ""} maxLength={30} autoComplete="tel" className="field" /></label>
        <label className="grid gap-2 sm:col-span-2"><span className="text-sm font-semibold">Email</span><input type="email" value={profile.email ?? ""} disabled className="field opacity-65" /><span className="text-xs text-[#5F6875]">Email is the sign-in identity and cannot be changed here.</span></label>
      </div>
      <div className="mt-6 flex items-center gap-4">
        <button disabled={pending} className="min-h-11 bg-[#132A46] px-6 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save profile"}</button>
        {message && <p className="text-sm text-[#5F6875]" role="status">{message}</p>}
      </div>
    </form>
  );
}
