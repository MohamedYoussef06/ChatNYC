"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useAuthMode } from "@/components/auth/AuthProvider";
import { Icon } from "@/components/ui/Icon";
import { Wordmark } from "@/components/ui/Wordmark";
import { useUserLocation } from "@/hooks/useUserLocation";

const links = [
  { href: "/assistant", label: "Ock" },
  { href: "/navigate", label: "NextStop" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { userMode, setUserMode } = useAuthMode();
  const userLocation = useUserLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!profileOpen) return;
    profileMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !profileMenuRef.current?.contains(event.target)) setProfileOpen(false);
    }
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setProfileOpen(false);
      profileButtonRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!profileMenuRef.current || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(profileMenuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter((item) => !item.hasAttribute("disabled"));
    if (!items.length) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : event.key === "ArrowDown" ? (current + 1) % items.length : (current <= 0 ? items.length - 1 : current - 1);
    items[next]?.focus();
  }

  const locationLabel = userLocation.status === "granted" ? "Available"
    : userLocation.status === "requesting" ? "Requesting…"
      : userLocation.status === "denied" ? "Permission denied"
        : userLocation.status === "unavailable" ? "Unavailable"
          : "Not shared";

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
          <div ref={profileMenuRef} className="relative" onKeyDown={handleMenuKeyDown} onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setProfileOpen(false);
          }}>
            <button ref={profileButtonRef} type="button" aria-label="Open profile and account menu" title="Profile and account menu" aria-haspopup="menu" aria-expanded={profileOpen} aria-controls="profile-menu" onClick={() => setProfileOpen((open) => !open)} className={`profile-menu-trigger flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors ${pathname === "/profile" || pathname === "/wallet" || profileOpen ? "border-[#aebfdd] bg-[#edf2fb] text-[#0039a6]" : "border-[#d9dcdf] bg-white text-[#535b61]"}`}>
              <Icon name="user" size={17} />
            </button>

            <div id="profile-menu" role="menu" aria-label="Profile and account" aria-hidden={!profileOpen} data-state={profileOpen ? "open" : "closed"} className="profile-menu absolute right-0 top-[calc(100%+10px)] z-50 w-[min(260px,calc(100vw-2.5rem))] overflow-hidden rounded-[13px] border border-[#dfe2df] bg-[#fffefa] text-left font-normal tracking-normal text-[#252a2e] shadow-[0_12px_32px_rgba(21,23,25,0.13)]">
              <Link href="/profile" prefetch={false} role="menuitem" onClick={() => setProfileOpen(false)} className="profile-menu-row block px-4 py-3.5">
                <span className="block text-xs font-semibold">{userMode === "authenticated" ? "Account" : "Guest"}</span>
                <span className="mt-0.5 block text-[10px] text-[#747b80]">{userMode === "authenticated" ? "Signed in" : "Not signed in"}</span>
              </Link>

              <Link href="/wallet" prefetch={false} role="menuitem" aria-current={pathname === "/wallet" ? "page" : undefined} onClick={() => setProfileOpen(false)} className="profile-menu-row flex items-center justify-between gap-4 border-t border-[#e8eae7] px-4 py-3">
                <span><span className="block text-xs font-semibold">Wallet</span><span className="mt-0.5 block text-[10px] text-[#747b80]">Demo wallet</span></span>
                <Icon name="wallet" size={15} className="shrink-0 text-[#0039a6]" />
              </Link>

              <Link href="/profile#memory" prefetch={false} role="menuitem" onClick={() => setProfileOpen(false)} className="profile-menu-row block border-t border-[#e8eae7] px-4 py-3">
                <span className="block text-xs font-semibold">Ock memory</span>
                <span className="mt-0.5 block text-[10px] text-[#747b80]">View what Ock remembers</span>
              </Link>

              <button type="button" role="menuitem" disabled={userLocation.status === "requesting"} onClick={() => {
                setProfileOpen(false);
                profileButtonRef.current?.focus();
                void userLocation.requestLocation();
              }} className="profile-menu-row flex w-full items-center justify-between gap-4 border-t border-[#e8eae7] px-4 py-3 text-left disabled:cursor-wait disabled:opacity-65">
                <span><span className="block text-xs font-semibold">Location</span><span className="mt-0.5 block text-[10px] text-[#747b80]">{locationLabel}</span></span>
                <Icon name="pin" size={15} className="shrink-0 text-[#0039a6]" />
              </button>

              <div role="none" className="border-t border-[#e8eae7] p-1.5">
                {userMode === "authenticated" ? (
                  <button type="button" role="menuitem" onClick={() => {
                    setProfileOpen(false);
                    setUserMode(null);
                    router.push("/");
                  }} className="profile-menu-row flex min-h-10 w-full items-center justify-between rounded-lg px-2.5 text-left text-xs font-semibold text-[#0039a6]">
                    Sign out <Icon name="arrow-right" size={14} />
                  </button>
                ) : (
                  <Link href="/?mode=login" prefetch={false} role="menuitem" onClick={() => setProfileOpen(false)} className="profile-menu-row flex min-h-10 items-center justify-between rounded-lg px-2.5 text-xs font-semibold text-[#0039a6]">
                    Sign in <Icon name="arrow-right" size={14} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
