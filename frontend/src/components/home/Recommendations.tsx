"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";
import { TransitBadge, type SubwayLine } from "@/components/ui/TransitBadge";
import { useScrollReveal } from "@/components/ui/useScrollReveal";

/** Shape for future place-service results; current entries below are demo-only. */
type OckPlaceRecommendation = {
  placeId: string;
  name: string;
  address?: string;
  neighborhood?: string;
  photoUrl?: string;
  photoAttribution?: string;
  category?: string;
  price?: string;
  subwayLines?: SubwayLine[];
  reason: string;
  prompt: string;
  mockImage: string;
  imageAlt: string;
};

const recommendations: OckPlaceRecommendation[] = [
  {
    placeId: "mock-smalls-jazz-club",
    name: "Smalls Jazz Club",
    neighborhood: "West Village, Manhattan",
    category: "LIVE MUSIC",
    price: "From $20",
    subwayLines: ["1"],
    reason: "A close-up jazz room for the live sets you keep asking about.",
    prompt: "Tell me about Smalls Jazz Club and what else is nearby.",
    mockImage: "/images/nyc/jazz.jpg",
    imageAlt: "An intimate downtown New York jazz club",
  },
  {
    placeId: "mock-washington-square-park",
    name: "Washington Square Park",
    neighborhood: "Greenwich Village, Manhattan",
    category: "OUTDOORS",
    price: "Free",
    subwayLines: ["A", "C", "E"],
    reason: "An easy outdoor reset with street music and plenty to watch.",
    prompt: "What should I do around Washington Square Park?",
    mockImage: "/images/nyc/park.jpg",
    imageAlt: "A green pocket of New York City parkland",
  },
  {
    placeId: "mock-union-square-greenmarket",
    name: "Union Square Greenmarket",
    neighborhood: "Union Square, Manhattan",
    category: "FOOD & CITY LIFE",
    price: "Free entry",
    subwayLines: ["N", "Q", "R"],
    reason: "A lively local-food stop that fits your taste for low-key city finds.",
    prompt: "What is worth checking out at Union Square Greenmarket?",
    mockImage: "/images/nyc/market.jpg",
    imageAlt: "A neighborhood market in New York",
  },
];

function recommendationImage(place: OckPlaceRecommendation) {
  // A future photoUrl can come directly from the place service; local imagery is the demo fallback.
  return place.photoUrl || place.mockImage;
}

export function OckRecommendations() {
  const eyebrowReveal = useScrollReveal({ duration: 600, once: false });
  const headingReveal = useScrollReveal({ delay: 75, duration: 600, once: false });
  const descriptionReveal = useScrollReveal({ delay: 145, duration: 600, once: false });
  const cardsReveal = useScrollReveal({ delay: 210, duration: 700, scale: 0.98, once: false });

  return (
    <section aria-labelledby="ock-recommendations-heading" className="border-t border-[#e4e5e2] pb-8 pt-8 sm:pb-10 sm:pt-9">
      <div>
        <p {...eyebrowReveal} className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#656862]">A little local intuition</p>
        <h2 {...headingReveal} id="ock-recommendations-heading" className="text-[27px] font-semibold leading-tight tracking-[-0.045em] text-[#151719] sm:text-[32px]">Ock thinks you&apos;d like...</h2>
        <p {...descriptionReveal} className="mt-2 text-sm leading-6 text-[#656862]">Based on what you&apos;ve told Ock.</p>
      </div>

      <ul {...cardsReveal} className="home-place-list mt-5 grid list-none gap-3 p-0 md:grid-cols-3 sm:gap-4">
        {recommendations.map((place, index) => (
          <li key={place.placeId} style={{ "--card-index": index } as CSSProperties}>
            <article className="home-place-card group h-full overflow-hidden rounded-[14px] border border-[#e1e3e0] bg-white">
              <div className="relative aspect-[16/10] overflow-hidden bg-[#e9e9e5]">
                <Image src={recommendationImage(place)} alt={place.imageAlt} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="home-place-image object-cover" />
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-bold tracking-[0.12em] text-[#30363b]">{place.category}</span>
                {place.price && <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-[#30363b]">{place.price}</span>}
              </div>
              <div className="p-4">
                <h3 className="text-base font-semibold tracking-tight text-[#202529]">{place.name}</h3>
                <p className="mt-1 text-[11px] font-medium text-[#636a70]">{place.neighborhood}</p>
                <p className="mt-3 min-h-[40px] text-xs leading-5 text-[#4f575d]">{place.reason}</p>
                <div className="mt-3 flex min-h-6 items-center justify-between gap-3">
                  <div className="flex items-center gap-1" aria-label={place.subwayLines?.length ? `Nearby subway: ${place.subwayLines.join(", ")}` : undefined}>
                    {place.subwayLines?.map((line) => <TransitBadge key={line} line={line} small />)}
                  </div>
                  {place.photoAttribution && <span className="text-[9px] text-[#737a7f]">{place.photoAttribution}</span>}
                </div>
                <Link href={`/assistant?q=${encodeURIComponent(place.prompt)}`} prefetch={false} className="home-place-link mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0039A6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0039A6]">
                  Ask Ock about this <Icon name="arrow-right" size={14} className="home-place-arrow transition-transform duration-200" />
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[9px] leading-4 text-[#777d82]">Demo suggestions · recommendations are mock and frontend-only.</p>
    </section>
  );
}
