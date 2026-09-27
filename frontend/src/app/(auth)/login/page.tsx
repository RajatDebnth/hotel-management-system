import Link from "next/link";

import { signIn } from "@/app/auth/actions";
import { AuthShell, fieldClassName } from "@/components/auth/auth-shell";
import { SubmitButton } from "@/components/auth/submit-button";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to view and manage your reservations."
      error={params.error}
      message={params.message}
      footer={<><span>New here? </span><Link className="font-medium text-foreground underline" href="/register">Create an account</Link></>}
    >
      <form action={signIn} className="space-y-4">
        <input type="hidden" name="next" value={params.next ?? ""} />
        <label className="block text-sm font-medium">Email
          <input className={fieldClassName} name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block text-sm font-medium">Password
          <input className={fieldClassName} name="password" type="password" autoComplete="current-password" required />
        </label>
        <p className="text-right text-sm text-muted-foreground">Password changes are available after sign-in.</p>
        <SubmitButton>Sign in</SubmitButton>
      </form>
    </AuthShell>
  );
}
