import { changePassword } from "@/app/auth/actions";
import { fieldClassName } from "@/components/auth/auth-shell";

export default async function AccountSecurityPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;

  return (
    <main>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A06F29]">Account protection</p>
      <h1 className="mt-2 font-heading text-4xl sm:text-5xl">Password & security</h1>
      <p className="mt-3 max-w-2xl text-[#5F6875]">Use a unique password of at least 12 characters and update it if you suspect anyone else knows it.</p>
      {(params.error || params.message) && <p className={`mt-6 max-w-3xl border p-4 text-sm ${params.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`} role={params.error ? "alert" : "status"}>{params.error ?? params.message}</p>}
      <form action={changePassword} className="mt-8 max-w-3xl border border-[#D9DEE5] bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Change password</h2>
        <p className="mt-2 text-sm text-[#5F6875]">Your new password takes effect immediately after it is saved.</p>
        <div className="mt-6 grid gap-5">
          <label className="grid gap-2 text-sm font-semibold">Current password<input className={fieldClassName} name="currentPassword" type="password" autoComplete="current-password" required /></label>
          <label className="grid gap-2 text-sm font-semibold">New password<input className={fieldClassName} name="newPassword" type="password" autoComplete="new-password" minLength={12} required /></label>
          <label className="grid gap-2 text-sm font-semibold">Confirm new password<input className={fieldClassName} name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required /></label>
        </div>
        <button className="mt-6 min-h-11 bg-[#132A46] px-6 text-sm font-semibold text-white hover:bg-[#1E3C61]">Update password</button>
      </form>
    </main>
  );
}
