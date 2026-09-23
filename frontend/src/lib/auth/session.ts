import "server-only";

import { cookies } from "next/headers";

import type { components } from "@/lib/api-schema";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getPublicEnvironment } from "@/lib/env";

const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export type LocalUser = components["schemas"]["AuthenticatedUser"];

export async function getSessionCookieHeader(): Promise<string | undefined> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return token ? `${SESSION_COOKIE_NAME}=${token}` : undefined;
}

export async function getCurrentUser(adminOnly = false): Promise<LocalUser | null> {
  const cookie = await getSessionCookieHeader();
  if (!cookie) return null;

  const endpoint = adminOnly ? "/api/v1/auth/admin-check" : "/api/v1/auth/me";
  const response = await fetch(`${getPublicEnvironment().apiUrl}${endpoint}`, {
    headers: { Cookie: cookie },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<LocalUser>;
}

export async function storeSessionFromResponse(response: Response): Promise<void> {
  const setCookie = response.headers.get("set-cookie");
  const match = setCookie?.match(new RegExp(`(?:^|,\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  if (!match) throw new Error("The API did not create a local session.");

  (await cookies()).set({
    name: SESSION_COOKIE_NAME,
    value: match[1],
    httpOnly: true,
    sameSite: "lax",
    secure: /;\s*Secure(?:;|$)/i.test(setCookie ?? ""),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}

export function frontendOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
