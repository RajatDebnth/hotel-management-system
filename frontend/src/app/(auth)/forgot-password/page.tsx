import Link from "next/link";

import { requestPasswordReset } from "@/app/auth/actions";
import { AuthShell, fieldClassName } from "@/components/auth/auth-shell";
import { SubmitButton } from "@/components/auth/submit-button";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <AuthShell
      title="Reset your password"
      description="Enter your account email and we will send a secure reset link."
      error={params.error}
      footer={<Link className="font-medium text-foreground underline" href="/login">Return to sign in</Link>}
    >
      <form action={requestPasswordReset} className="space-y-4">
        <label className="block text-sm font-medium">Email
          <input className={fieldClassName} name="email" type="email" autoComplete="email" required />
        </label>
        <SubmitButton>Send reset link</SubmitButton>
      </form>
    </AuthShell>
  );
}

