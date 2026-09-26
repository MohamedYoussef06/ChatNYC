"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

const links = [
  { href: "/discover", label: "Discover" },
  { href: "/navigate", label: "CityPilot" },
  { href: "/assistant", label: "Assistant" },
  { href: "/profile", label: "Profile" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-t-[3px] border-t-[#151719] border-b border-b-[#e4e5e2] bg-[#faf9f6]">
      <div className="mx-auto flex max-w-[1248px] flex-wrap items-center justify-between gap-x-6 px-5 pt-4 sm:px-8 md:h-[82px] md:flex-nowrap md:py-0">
        <Link href="/" prefetch={false} aria-label="Borough home" className="flex items-center gap-2.5 rounded-sm">
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-[#0039a6] text-white"><Icon name="arrow-up-right" size={25} /></span>
          <span className="text-[28px] font-extrabold tracking-[-0.07em]">borough<span className="text-[#0039a6]">.</span></span>
        </Link>

        <nav aria-label="Main navigation" className="order-last mt-3 flex w-full items-center justify-between gap-1 md:order-none md:mt-0 md:w-auto md:gap-2">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} prefetch={false} aria-current={active ? "page" : undefined} className={`border-b-2 px-2 py-3.5 text-[13px] font-medium transition-colors sm:px-4 md:rounded-lg md:border-b-0 md:py-2.5 ${active ? "border-[#0039a6] text-[#0039a6] md:bg-[#edf2fb]" : "border-transparent text-[#555a60] hover:text-[#0039a6] md:hover:bg-[#f0f1ed]"}`}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.03em] text-[#60656b]">
          <Icon name="pin" size={14} className="text-[#0039a6]" />
          <span className="hidden min-[380px]:inline">NEW YORK CITY</span>
          <span className="min-[380px]:hidden">NYC</span>
        </div>
      </div>
    </header>
  );
}
