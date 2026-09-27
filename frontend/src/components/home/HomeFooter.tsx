"use client";

import { useScrollReveal } from "@/components/ui/useScrollReveal";

export function HomeFooter() {
  const footerReveal = useScrollReveal({ duration: 700, once: false });

  return (
    <footer {...footerReveal} className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e0e2df] py-7 text-xs text-[#6a6e72]">
      <p className="font-semibold tracking-tight text-[#43484d]">ChatNYC <span className="ml-2 font-normal">A city of possibilities. A companion for yours.</span></p>
      <p>Made for the five boroughs <span className="ml-1 text-[#0039a6]" aria-hidden="true">↗</span></p>
    </footer>
  );
}
