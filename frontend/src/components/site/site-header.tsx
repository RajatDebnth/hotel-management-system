"use client";

import { ChevronDown, LayoutDashboard, LockKeyhole, LogOut, Menu, UserRound, UserRoundPen, History } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { signOut } from "@/app/auth/actions";
import { getPublicEnvironment } from "@/lib/env";

type Viewer = {
  email: string;
  role: "customer" | "admin";
};

const sectionLinks = [
  ["Home", "/"],
  ["Rooms", "/rooms"],
  ["Contact", "/contact"],
] as const;

const customerLinks = [
  ["Account overview", "/account", UserRound],
  ["Previous stays", "/account/stays", History],
  ["Personal details", "/account/details", UserRoundPen],
  ["Password & security", "/account/security", LockKeyhole],
] as const;

const adminLinks = [
  ["Admin dashboard", "/admin", LayoutDashboard],
  ["Security", "/admin/security", LockKeyhole],
] as const;

function ProfileMenu({ viewer }: { viewer: Viewer }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const links = viewer.role === "admin" ? adminLinks : customerLinks;
  const initial = viewer.email.slice(0, 1).toUpperCase();

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Open profile menu for ${viewer.email}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 items-center gap-2 border border-[#C9D0D9] bg-white px-2 text-[#132A46] transition hover:border-[#132A46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#132A46] focus-visible:ring-offset-2 sm:px-3"
      >
        <span className="grid size-7 place-items-center bg-[#132A46] text-xs font-bold text-white" aria-hidden="true">{initial}</span>
        <span className="hidden max-w-32 truncate text-sm font-semibold xl:block">Profile</span>
        <ChevronDown className={`hidden size-4 transition-transform sm:block ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div role="menu" aria-label="Profile menu" className="absolute right-0 z-50 mt-3 w-72 border border-[#D9DEE5] bg-[#F8F7F3] p-2 shadow-2xl shadow-[#132A46]/15">
          <div className="border-b border-[#D9DEE5] px-3 py-3">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#A06F29]">Signed in</p>
            <p className="mt-1 truncate text-sm font-semibold text-[#132A46]">{viewer.email}</p>
          </div>
          <div className="py-2">
            {links.map(([label, href, Icon]) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 px-3 text-sm font-semibold text-[#405066] transition hover:bg-white hover:text-[#132A46] focus-visible:bg-white focus-visible:outline-none"
              >
                <Icon className="size-4 text-[#A9782F]" aria-hidden="true" /> {label}
              </Link>
            ))}
          </div>
          <form action={signOut} className="border-t border-[#D9DEE5] pt-2">
            <button role="menuitem" className="flex min-h-11 w-full items-center gap-3 px-3 text-sm font-semibold text-[#7A2F2F] transition hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none">
              <LogOut className="size-4" aria-hidden="true" /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [viewer, setViewer] = useState<Viewer | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${getPublicEnvironment().apiUrl}/api/v1/auth/me`, {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() as Promise<Viewer> : null)
      .then((identity) => setViewer(identity))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setViewer(null);
      });
    return () => controller.abort();
  }, [pathname]);

  return (
    <header className="sticky inset-x-0 top-0 z-50 border-b border-[#D9DEE5] bg-[#F8F7F3]/95 text-[#132A46] backdrop-blur-xl">
      <div className="site-container flex h-18 items-center justify-between gap-5">
        <Link
          href="/#home"
          className="shrink-0 font-heading text-lg font-semibold tracking-[0.12em] uppercase sm:text-xl"
          aria-label="Aurelia House home"
        >
          Aurelia <span className="text-[#A9782F]">House</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {sectionLinks.map(([label, href]) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "border-[#C59A52] text-[#132A46]"
                    : "border-transparent text-[#5F6875] hover:border-[#C9D0D9] hover:text-[#132A46]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0 lg:gap-3">
          {viewer ? (
            <ProfileMenu viewer={viewer} />
          ) : (
            <Link href="/login" className="hidden px-3 py-2 text-sm font-semibold text-[#405066] transition hover:text-[#132A46] sm:block">
              Sign in
            </Link>
          )}
          <Link
            href="/rooms"
            className="hidden bg-[#132A46] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E3C61] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#132A46] focus-visible:ring-offset-2 sm:block"
          >
            Book Your Stay
          </Link>
        </div>

        <details className="group relative lg:hidden">
          <summary
            className="flex size-11 cursor-pointer list-none items-center justify-center border border-[#C9D0D9] bg-white text-[#132A46] [&::-webkit-details-marker]:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </summary>
          <nav
            className="absolute right-0 mt-3 w-64 border border-[#D9DEE5] bg-[#F8F7F3] p-3 shadow-2xl shadow-[#132A46]/15"
            aria-label="Mobile navigation"
          >
            {sectionLinks.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="block border-b border-[#E5E8EC] px-3 py-3 text-sm font-semibold text-[#405066] last:border-0 hover:bg-white hover:text-[#132A46]"
              >
                {label}
              </Link>
            ))}
            {!viewer && <Link href="/login" className="mt-2 block px-3 py-3 text-sm font-semibold text-[#132A46]">Sign in</Link>}
            <Link href="/rooms" className="mt-1 block bg-[#132A46] px-4 py-3 text-center text-sm font-semibold text-white">
              Book Your Stay
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
