"use client";

import { useState } from "react";
import { Hero } from "@/components/home/Hero";
import { QuickActions } from "@/components/home/QuickActions";
import { Recommendations } from "@/components/home/Recommendations";
import { Icon } from "@/components/ui/Icon";
import { TransitBadge } from "@/components/ui/TransitBadge";

export default function HomePage() {
  const [query, setQuery] = useState("");

  return (
    <div className="home-dashboard">
      <Hero onSearch={setQuery} activeQuery={query} />
      <QuickActions />
      <Recommendations query={query} onClearQuery={() => setQuery("")} />

      <aside aria-label="Explore at your own pace" className="my-12 flex flex-col justify-between gap-5 rounded-2xl border border-[#dfe5ee] bg-[#eef3fa] px-6 py-7 sm:flex-row sm:items-center sm:px-8">
        <div className="flex items-center gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-[#0039a6] text-[#0039a6]"><Icon name="route" size={23} /></span>
          <div>
            <h2 className="text-lg font-bold tracking-tight">You don’t have to know the city to belong here.</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#606873]">One new place. One new route. A little more New Yorker.</p>
          </div>
        </div>
        <div className="flex gap-1.5" aria-label="A city of possibilities">
          {(["1", "A", "N", "L"] as const).map((line) => <TransitBadge key={line} line={line} />)}
        </div>
      </aside>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e0e2df] py-7 text-xs text-[#6a6e72]">
        <p className="font-semibold tracking-tight text-[#43484d]">borough. <span className="ml-2 font-normal">A city of possibilities. A companion for yours.</span></p>
        <p>Made for the five boroughs <span className="ml-1 text-[#0039a6]" aria-hidden="true">↗</span></p>
      </footer>
    </div>
  );
}
