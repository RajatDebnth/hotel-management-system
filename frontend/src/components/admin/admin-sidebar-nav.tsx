"use client";

import {
  ArrowUpRight,
  BedDouble,
  CalendarCheck,
  LockKeyhole,
  LayoutDashboard,
  MessageSquareText,
  ContactRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";

const navGroups = [
  {
    label: "Front desk",
    links: [
      { href: "/admin", label: "Today", icon: LayoutDashboard, exact: true },
      { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
      { href: "/admin/enquiries", label: "Enquiries", icon: MessageSquareText },
    ],
  },
  {
    label: "Property",
    links: [{ href: "/admin/inventory", label: "Rooms & inventory", icon: BedDouble }],
  },
  {
    label: "Administration",
    links: [
      { href: "/admin/users", label: "People & access", icon: Users },
      { href: "/admin/visitors", label: "Visitors", icon: ContactRound },
      { href: "/admin/security", label: "Security", icon: LockKeyhole },
    ],
  },
];

const secondaryLinks = [
  { href: "/", label: "View hotel", icon: ArrowUpRight },
];

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <nav aria-label="Admin navigation" className="flex min-w-max gap-1 lg:grid lg:min-w-0 lg:gap-5">
        {navGroups.map((group) => <div key={group.label} className="contents lg:block">
          <p className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 lg:block">{group.label}</p>
          <div className="contents lg:grid lg:gap-1">
            {group.links.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn(
                  "group flex min-h-11 min-w-32 items-center gap-3 border border-transparent px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 lg:min-w-0",
                  active ? "border-neutral-950 bg-neutral-950 text-white" : "text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-950",
                )}>
                  <Icon className="size-4" aria-hidden="true" />
                  <span>{item.label}</span>
                  {active && <span className="ml-auto size-1.5 bg-white" aria-hidden="true" />}
                </Link>
              );
            })}
          </div>
        </div>)}
      </nav>

      <div className="my-5 hidden border-t border-neutral-200 lg:block" />

      <nav aria-label="Account navigation" className="hidden gap-1 lg:grid">
        {secondaryLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-10 items-center gap-3 border border-transparent px-3 text-sm font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
            >
              <Icon className="size-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
