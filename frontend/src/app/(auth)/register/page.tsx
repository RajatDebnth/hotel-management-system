import Link from "next/link";

import { signUp } from "@/app/auth/actions";
import { AuthShell, fieldClassName } from "@/components/auth/auth-shell";
import { SubmitButton } from "@/components/auth/submit-button";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <AuthShell
      title="Create your account"
      description="Register to reserve rooms and manage your stays."
      error={params.error}
      footer={<><span>Already registered? </span><Link className="font-medium text-foreground underline" href="/login">Sign in</Link></>}
    >
      <form action={signUp} className="space-y-4">
        <label className="block text-sm font-medium">Full name
          <input className={fieldClassName} name="fullName" autoComplete="name" maxLength={120} required />
        </label>
        <label className="block text-sm font-medium">Email
          <input className={fieldClassName} name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block text-sm font-medium">Password
          <input className={fieldClassName} name="password" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        <label className="block text-sm font-medium">Confirm password
          <input className={fieldClassName} name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        <SubmitButton>Create account</SubmitButton>
      </form>
    </AuthShell>
  );
}

