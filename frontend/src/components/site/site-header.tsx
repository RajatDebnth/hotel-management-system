"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const sectionLinks = [
  ["Home", "home"],
  ["Gallery", "gallery"],
  ["Contact", "contact"],
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    if (pathname !== "/" || typeof IntersectionObserver === "undefined") return;
    const sections = sectionLinks
      .map(([, id]) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-24% 0px -62%", threshold: [0, 0.2, 0.6] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
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
          {sectionLinks.map(([label, id]) => {
            const active = pathname === "/" && activeSection === id;
            return (
              <Link
                key={id}
                href={`/#${id}`}
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

        <div className="hidden items-center gap-3 sm:flex">
          <Link href="/login" className="px-3 py-2 text-sm font-semibold text-[#405066] transition hover:text-[#132A46]">
            Sign in
          </Link>
          <Link
            href="/rooms"
            className="bg-[#132A46] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E3C61] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#132A46] focus-visible:ring-offset-2"
          >
            Book Your Stay
          </Link>
        </div>

        <details className="group relative sm:hidden">
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
            {sectionLinks.map(([label, id]) => (
              <Link
                key={id}
                href={`/#${id}`}
                className="block border-b border-[#E5E8EC] px-3 py-3 text-sm font-semibold text-[#405066] last:border-0 hover:bg-white hover:text-[#132A46]"
              >
                {label}
              </Link>
            ))}
            <Link href="/login" className="mt-2 block px-3 py-3 text-sm font-semibold text-[#132A46]">
              Sign in
            </Link>
            <Link href="/rooms" className="mt-1 block bg-[#132A46] px-4 py-3 text-center text-sm font-semibold text-white">
              Book Your Stay
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
