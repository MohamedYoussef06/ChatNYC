"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { TransitBadge } from "@/components/ui/TransitBadge";
import type { Recommendation } from "@/lib/recommendations";

function citypilotDestination(place: Recommendation) {
  if (place.id === "village-jazz-night") return "Smalls Jazz Club";
  if (place.id === "washington-square-afternoon") return "Washington Square Park";
  if (place.id === "greenmarket-morning") return "Union Square Greenmarket";
  if (place.id === "brooklyn-waterfront") return "Williamsburg Waterfront";
  if (place.id === "museum-mile") return "Museum Mile";
  return `${place.neighborhood} pizza`;
}

export function AssistantRecommendation({ place }: { place: Recommendation }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-xl border border-[#e1e4e2] bg-white p-3.5 shadow-[0_2px_8px_rgba(21,23,25,0.035)]">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#0039a6]">{place.category}</p>
      <h3 className="mt-1 text-sm font-semibold leading-5 tracking-[-0.015em] text-[#202428]">{place.title}</h3>
      <p className="mt-1 flex items-center gap-1 text-[10px] text-[#686e73]"><Icon name="pin" size={12} className="text-[#0039a6]" />{place.neighborhood}, {place.borough}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[10px] text-[#565d62]">
        {place.price && <span className="font-semibold">{place.price}</span>}
        {place.lines?.map((line) => <TransitBadge key={line} line={line} small />)}
        <span>{place.away}</span>
      </div>
      {expanded && <p className="mt-3 border-t border-[#e7e9e6] pt-2.5 text-[11px] leading-5 text-[#5a6267]">{place.description} <span className="block mt-1 text-[10px]">Nearest stop: {place.station} · {place.walk}</span></p>}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#e7e9e6] pt-2.5">
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="min-h-8 rounded-md px-2 text-[10px] font-semibold text-[#454c51] hover:bg-[#f1f3f2]">{expanded ? "Hide details" : "View place"}</button>
        <Link href={`/navigate?destination=${encodeURIComponent(citypilotDestination(place))}`} className="inline-flex min-h-8 items-center gap-1 rounded-md bg-[#0039a6] px-2.5 text-[10px] font-semibold text-white hover:bg-[#002d85]">Get me there <Icon name="arrow-right" size={13} /></Link>
      </div>
    </article>
  );
}
