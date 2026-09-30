"use client";

import { ArrowRight, CalendarDays, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { availabilitySearch } from "@/lib/availability-search";

function localDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function HeroAvailabilityForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = availabilitySearch({
      checkIn: String(form.get("check_in") ?? ""),
      checkOut: String(form.get("check_out") ?? ""),
      guests: Number(form.get("guests")),
    }, localDate());

    if ("error" in result) {
      setError(result.error);
      return;
    }
    setError("");
    router.push(result.href);
  }

  return (
    <form onSubmit={submit} className="mt-14 border border-white/20 bg-[#F8F7F3] p-4 text-[#132A46] shadow-2xl shadow-black/15 lg:col-span-2 lg:max-w-5xl" noValidate>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_.7fr_auto] md:items-end">
        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#405066]">
          <span className="flex items-center gap-2"><CalendarDays className="size-4 text-[#A9782F]" aria-hidden="true" />Check in</span>
          <input className="min-h-12 border border-[#C9D0D9] bg-white px-3 text-base font-medium outline-none focus:border-[#132A46] focus:ring-1 focus:ring-[#132A46]" type="date" name="check_in" min={localDate()} required />
        </label>
        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#405066]">
          <span className="flex items-center gap-2"><CalendarDays className="size-4 text-[#A9782F]" aria-hidden="true" />Check out</span>
          <input className="min-h-12 border border-[#C9D0D9] bg-white px-3 text-base font-medium outline-none focus:border-[#132A46] focus:ring-1 focus:ring-[#132A46]" type="date" name="check_out" min={localDate()} required />
        </label>
        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#405066]">
          <span className="flex items-center gap-2"><UsersRound className="size-4 text-[#A9782F]" aria-hidden="true" />Guests</span>
          <select className="min-h-12 border border-[#C9D0D9] bg-white px-3 text-base font-medium outline-none focus:border-[#132A46] focus:ring-1 focus:ring-[#132A46]" name="guests" defaultValue="2">
            {[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count} guest{count === 1 ? "" : "s"}</option>)}
          </select>
        </label>
        <button className="inline-flex min-h-12 items-center justify-center gap-3 bg-[#C59A52] px-6 text-sm font-bold text-[#132A46] transition hover:bg-[#D8B772]">
          Check availability <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 flex flex-col justify-between gap-2 text-xs sm:flex-row">
        <p className="text-[#5F6875]">Live room inventory · No payment required to send a request</p>
        <p id="availability-error" role="alert" className="font-semibold text-red-700" aria-live="polite">{error}</p>
      </div>
    </form>
  );
}
