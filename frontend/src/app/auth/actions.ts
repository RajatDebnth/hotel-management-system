"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clearSession,
  frontendOrigin,
  getSessionCookieHeader,
  storeSessionFromResponse,
} from "@/lib/auth/session";
import { getPublicEnvironment } from "@/lib/env";
import { destinationForRole, type ApplicationRole } from "@/lib/auth/routing";

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function messageUrl(path: string, kind: "error" | "message", message: string): string {
  return `${path}?${new URLSearchParams({ [kind]: message })}`;
}

async function authRequest(path: string, payload?: unknown): Promise<Response> {
  const cookie = await getSessionCookieHeader();
  const headers = new Headers({ Origin: frontendOrigin() });
  if (payload !== undefined) headers.set("Content-Type", "application/json");
  if (cookie) headers.set("Cookie", cookie);
  return fetch(`${getPublicEnvironment().apiUrl}${path}`, {
    method: "POST",
    headers,
    body: payload === undefined ? undefined : JSON.stringify(payload),
    cache: "no-store",
  });
}

async function errorDetail(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null) as { detail?: string | Array<{ msg?: string }> } | null;
  if (Array.isArray(body?.detail)) return body.detail.map((item) => item.msg).filter(Boolean).join(" ") || fallback;
  return body?.detail ?? fallback;
}

export async function signUp(formData: FormData) {
  const fullName = value(formData, "fullName");
  const email = value(formData, "email");
  const password = value(formData, "password");
  const confirmPassword = value(formData, "confirmPassword");
  if (!fullName || !email || password.length < 12) redirect(messageUrl("/register", "error", "Complete all fields with a 12+ character password."));
  if (password !== confirmPassword) redirect(messageUrl("/register", "error", "Passwords do not match."));

  const response = await authRequest("/api/v1/auth/register", { full_name: fullName, email, password });
  if (!response.ok) redirect(messageUrl("/register", "error", await errorDetail(response, "Account creation failed.")));
  await storeSessionFromResponse(response);
  redirect("/");
}

export async function signIn(formData: FormData) {
  const response = await authRequest("/api/v1/auth/login", {
    email: value(formData, "email"),
    password: value(formData, "password"),
  });
  if (!response.ok) redirect(messageUrl("/login", "error", "Invalid email or password."));
  const identity = await response.json() as { role: ApplicationRole };
  await storeSessionFromResponse(response);
  redirect(destinationForRole(identity.role, value(formData, "next")));
}

export async function signOut() {
  await authRequest("/api/v1/auth/logout");
  await clearSession();
  revalidatePath("/account", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/book", "layout");
  revalidatePath("/", "layout");
  redirect("/");
}

async function changePasswordFor(formData: FormData, destination: string) {
  const currentPassword = value(formData, "currentPassword");
  const newPassword = value(formData, "newPassword");
  const confirmPassword = value(formData, "confirmPassword");
  if (newPassword.length < 12 || newPassword !== confirmPassword) {
    redirect(messageUrl(destination, "error", "Use matching new passwords of at least 12 characters."));
  }
  const response = await authRequest("/api/v1/auth/password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
  if (!response.ok) redirect(messageUrl(destination, "error", await errorDetail(response, "Password change failed.")));
  redirect(messageUrl(destination, "message", "Password updated successfully."));
}

export async function changePassword(formData: FormData) {
  return changePasswordFor(formData, "/account/security");
}

export async function changeAdminPassword(formData: FormData) {
  return changePasswordFor(formData, "/admin/security");
}
