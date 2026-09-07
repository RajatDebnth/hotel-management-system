"use client";

import { useState } from "react";
import { createEnquiry } from "@/lib/api";

const inputClass = "mt-2 w-full rounded-xl border border-[#cfd5ce] bg-white px-4 py-3 outline-none transition focus:border-[#17352d] focus:ring-2 focus:ring-[#17352d]/15";

export function EnquiryForm() {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setState("sending");
    setMessage("");
    try {
      const result = await createEnquiry(Object.fromEntries(formData.entries()) as Record<string, string>);
      setState("success");
      setMessage(result.message);
    } catch {
      setState("error");
      setMessage("We couldn't send your enquiry. Please review the details and try again.");
    }
  }

  if (state === "success") return <div className="rounded-[2rem] bg-white p-10 shadow-xl" role="status"><p className="eyebrow text-[#947039]">Message received</p><h2 className="mt-4 font-heading text-4xl">Thank you for getting in touch.</h2><p className="mt-4 text-[#68746e]">{message}</p><button onClick={() => setState("idle")} className="mt-7 border-b border-[#17352d] pb-1 font-semibold">Send another enquiry</button></div>;

  return <form action={submit} className="rounded-[2rem] bg-white p-7 shadow-[0_24px_70px_-45px_rgba(23,53,45,.5)] sm:p-10"><h2 className="font-heading text-4xl">Send an enquiry</h2><p className="mt-3 text-sm leading-6 text-[#68746e]">Share a few details and our house team will reply by email.</p><div className="mt-8 grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold">Full name<input required maxLength={120} className={inputClass} name="name" autoComplete="name"/></label><label className="text-sm font-semibold">Email address<input required maxLength={320} className={inputClass} name="email" type="email" autoComplete="email"/></label><label className="text-sm font-semibold">Phone <span className="font-normal text-[#7c8881]">(optional)</span><input maxLength={30} className={inputClass} name="phone" type="tel" autoComplete="tel"/></label><label className="text-sm font-semibold">Subject<input required maxLength={200} className={inputClass} name="subject"/></label><label className="text-sm font-semibold sm:col-span-2">How can we help?<textarea required maxLength={5000} className={`${inputClass} min-h-36 resize-y`} name="message"/></label><label className="sr-only" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>{message && <p className="mt-5 text-sm text-red-700" role="alert">{message}</p>}<button disabled={state === "sending"} className="mt-6 rounded-full bg-[#17352d] px-7 py-3.5 font-semibold text-white disabled:cursor-wait disabled:opacity-60">{state === "sending" ? "Sending…" : "Send enquiry"}</button></form>;
}
