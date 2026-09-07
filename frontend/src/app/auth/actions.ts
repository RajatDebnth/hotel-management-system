"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function safeNext(valueToCheck: string, fallback: string): string {
  return valueToCheck.startsWith("/") && !valueToCheck.startsWith("//")
    ? valueToCheck
    : fallback;
}

function messageUrl(path: string, kind: "error" | "message", message: string): string {
  const params = new URLSearchParams({ [kind]: message });
  return `${path}?${params.toString()}`;
}

export async function signUp(formData: FormData) {
  const fullName = value(formData, "fullName");
  const email = value(formData, "email");
  const password = value(formData, "password");
  const confirmPassword = value(formData, "confirmPassword");

  if (!fullName || !email || password.length < 8) {
    redirect(messageUrl("/register", "error", "Complete all fields with an 8+ character password."));
  }
  if (password !== confirmPassword) {
    redirect(messageUrl("/register", "error", "Passwords do not match."));
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl}/auth/callback?next=/account`,
    },
  });

  if (error) redirect(messageUrl("/register", "error", error.message));
  if (data.session) redirect("/account");
  redirect(messageUrl("/login", "message", "Check your email to confirm your account."));
}

export async function signIn(formData: FormData) {
  const email = value(formData, "email");
  const password = value(formData, "password");
  const next = safeNext(value(formData, "next"), "/account");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect(messageUrl("/login", "error", "Invalid email or password."));
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = value(formData, "email");
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  if (error) redirect(messageUrl("/forgot-password", "error", error.message));
  redirect(messageUrl("/login", "message", "If that account exists, a reset link has been sent."));
}

export async function updatePassword(formData: FormData) {
  const password = value(formData, "password");
  const confirmPassword = value(formData, "confirmPassword");
  if (password.length < 8 || password !== confirmPassword) {
    redirect(messageUrl("/reset-password", "error", "Use matching passwords of at least 8 characters."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(messageUrl("/reset-password", "error", error.message));
  redirect(messageUrl("/account", "message", "Password updated successfully."));
}

