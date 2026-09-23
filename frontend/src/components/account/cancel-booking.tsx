"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { cancelBooking } from "@/lib/api";

export function CancelBooking({ reference }: { reference: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await cancelBooking(reference, String(form.get("reason")));
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Cancellation failed.");
    } finally {
      setPending(false);
    }
  }

  if (!open) return <button onClick={() => setOpen(true)} className="rounded-full border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-700">Cancel booking</button>;
  return (
    <form onSubmit={submit} className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
      <label className="grid gap-2"><span className="text-sm font-semibold text-red-900">Why are you cancelling?</span><textarea name="reason" required minLength={3} maxLength={500} rows={3} className="field bg-white" /></label>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex gap-3"><button disabled={pending} className="rounded-full bg-red-700 px-5 py-2.5 text-sm font-semibold text-white">{pending ? "Cancelling…" : "Confirm cancellation"}</button><button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold">Keep booking</button></div>
    </form>
  );
}
