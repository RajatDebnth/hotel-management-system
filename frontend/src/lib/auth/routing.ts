export type ApplicationRole = "customer" | "admin";

function safeLocalPath(value: string): string | null {
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export function destinationForRole(role: ApplicationRole, requestedPath: string): string {
  const requested = safeLocalPath(requestedPath);
  if (role === "admin") {
    return requested && (requested === "/admin" || requested.startsWith("/admin/"))
      ? requested
      : "/admin";
  }
  return requested && (
    requested === "/account" ||
    requested.startsWith("/account/") ||
    requested === "/book" ||
    requested.startsWith("/book/")
  )
    ? requested
    : "/";
}
