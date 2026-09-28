"use client";

import { CalendarDays, House, LockKeyhole, UserRoundPen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";

const links = [
  { href: "/account", label: "Overview", icon: House, exact: true },
  { href: "/account/stays", label: "Previous stays", icon: CalendarDays },
  { href: "/account/details", label: "Personal details", icon: UserRoundPen },
  { href: "/account/security", label: "Password & security", icon: LockKeyhole },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Customer account navigation"
      className="flex min-w-max gap-2 lg:grid lg:min-w-0"
    >
      {links.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href) || (item.href === "/account/stays" && pathname.startsWith("/account/bookings/"));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#132A46] focus-visible:ring-offset-2 lg:w-full",
              active
                ? "border-[#132A46] bg-[#132A46] text-white"
                : "border-[#D9DEE5] bg-white text-[#405066] hover:border-[#A9782F] hover:text-[#132A46]",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
            {active && <span className="ml-auto hidden size-1.5 bg-[#C59A52] lg:block" aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}
