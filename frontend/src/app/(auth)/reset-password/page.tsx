import { redirect } from "next/navigation";

import { updatePassword } from "@/app/auth/actions";
import { AuthShell, fieldClassName } from "@/components/auth/auth-shell";
import { SubmitButton } from "@/components/auth/submit-button";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login?error=Open+the+password+reset+link+from+your+email.");
  const params = await searchParams;
  return (
    <AuthShell title="Choose a new password" description="Use at least eight characters." error={params.error} footer={null}>
      <form action={updatePassword} className="space-y-4">
        <label className="block text-sm font-medium">New password
          <input className={fieldClassName} name="password" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        <label className="block text-sm font-medium">Confirm password
          <input className={fieldClassName} name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        <SubmitButton>Update password</SubmitButton>
      </form>
    </AuthShell>
  );
}

