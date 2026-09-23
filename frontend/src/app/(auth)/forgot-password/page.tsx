import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <AuthShell
      title="Reset your password"
      description="This local installation does not send password-reset email."
      error={params.error}
      footer={<Link className="font-medium text-foreground underline" href="/login">Return to sign in</Link>}
    >
      <p className="text-sm leading-6 text-muted-foreground">If you can still sign in, change your password from My account. Otherwise, ask the local hotel administrator to restore access.</p>
    </AuthShell>
  );
}
