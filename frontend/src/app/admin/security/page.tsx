import { changeAdminPassword } from "@/app/auth/actions";
import { fieldClassName } from "@/components/auth/auth-shell";

type Props = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function AdminSecurityPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <main className="admin-page">
      <section className="border-b border-neutral-300 pb-7">
        <p className="admin-kicker">Administrator access</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Security</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-500">
          Change the password for your own administrator account without entering the visitor workspace.
        </p>
      </section>

      <section className="admin-panel mt-8 max-w-2xl p-5 sm:p-6">
        {(params.error || params.message) && (
          <p
            className={`mb-5 border p-3 text-sm ${params.error ? "border-red-300 bg-red-50 text-red-800" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}
            role={params.error ? "alert" : "status"}
          >
            {params.error ?? params.message}
          </p>
        )}
        <form action={changeAdminPassword} className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            Current password
            <input className={fieldClassName} name="currentPassword" type="password" autoComplete="current-password" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            New password
            <input className={fieldClassName} name="newPassword" type="password" autoComplete="new-password" minLength={12} required />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Confirm new password
            <input className={fieldClassName} name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required />
          </label>
          <button className="admin-primary-button mt-2 w-fit">Update administrator password</button>
        </form>
      </section>
    </main>
  );
}
