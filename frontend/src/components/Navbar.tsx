"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthMode } from "@/components/auth/AuthProvider";
import { Icon } from "@/components/ui/Icon";
import { Wordmark } from "@/components/ui/Wordmark";

const links = [
  { href: "/assistant", label: "Ock" },
  { href: "/navigate", label: "NextStop" },
];

export function Navbar() {
  const pathname = usePathname();
  const { userMode } = useAuthMode();

  if (pathname === "/") return null;

  return (
    <header className="sticky top-0 z-40 border-t-[3px] border-t-[#151719] border-b border-b-[#e4e5e2] bg-[#faf9f6]">
      <div className="mx-auto flex max-w-[1248px] flex-wrap items-center justify-between gap-x-3 px-5 pt-4 sm:px-8 md:h-[82px] md:flex-nowrap md:gap-x-6 md:py-0">
        <Link href="/home" prefetch={false} aria-label="ChatNYC home" className="flex items-center gap-2.5 rounded-sm">
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-[#0039a6] text-white">
            <svg viewBox="0 0 26.2 20.4" width={27} height={21} aria-hidden="true">
              <path d="M0.4 13.4 L0.4 12.2 L2.7 10.7 L3.2 9.5 L2.8 8.6 L2.7 7.9 L4.8 7.5 L7.4 7.9 L9.4 7.9 L11.5 6.9 L11.8 5.0 L11.4 4.2 L12.8 3.2 L14.7 1.3 L16.6 0.4 L21.0 0.4 L20.8 2.6 L21.0 5.6 L21.3 6.6 L21.2 10.2 L20.5 13.2 L20.5 15.1 L20.3 16.4 L20.0 17.7 L19.8 18.1 L23.4 17.8 L25.7 17.4 L23.7 18.6 L21.1 19.4 L19.0 19.6 L18.0 19.9 L18.2 19.3 L18.9 18.7 L19.2 17.7 L16.7 16.2 L15.5 14.3 L14.5 13.4Z" fill="currentColor" stroke="currentColor" strokeWidth={0.6} strokeLinejoin="round" />
            </svg>
          </span>
          <Wordmark className="text-[25px] font-extrabold tracking-[-0.065em]" />
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

        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.03em] text-[#60656b] sm:gap-3">
          {userMode === "guest" && (
            <Link href="/?mode=signup" prefetch={false} className="whitespace-nowrap text-[10px] font-semibold text-[#0039a6] hover:underline sm:text-[11px]">
              <span className="hidden min-[640px]:inline">Let Ock remember you</span>
              <span className="min-[640px]:hidden">Create account</span>
            </Link>
          )}
          <Link href="/profile" prefetch={false} aria-label="Open profile and account settings" title="Profile and account settings" aria-current={pathname === "/profile" ? "page" : undefined} className={`flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors ${pathname === "/profile" ? "border-[#aebfdd] bg-[#edf2fb] text-[#0039a6]" : "border-[#d9dcdf] bg-white text-[#535b61] hover:border-[#0039a6] hover:text-[#0039a6]"}`}>
            <Icon name="user" size={17} />
          </Link>
        </div>
      </div>
    </header>
  );
}
