"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";
import { useScrollReveal } from "@/components/ui/useScrollReveal";

type ClassicPlace = {
  name: string;
  category: string;
  neighborhood: string;
  address: string;
  description: string;
  image: string;
  imageAlt: string;
  prompt: string;
};

const classicPlaces: ClassicPlace[] = [
  {
    name: "L’Industrie Pizzeria",
    category: "PIZZA",
    neighborhood: "West Village",
    address: "104 Christopher St, New York, NY 10014",
    description: "A defining New York slice, with a distinctly downtown following.",
    image: "/images/places/lindustrie-pizzeria.webp",
    imageAlt: "L’Industrie Pizzeria in the West Village",
    prompt: "Tell me about L'Industrie Pizzeria and why I should go.",
  },
  {
    name: "Red Hook Tavern",
    category: "BURGER",
    neighborhood: "Red Hook, Brooklyn",
    address: "329 Van Brunt St, Brooklyn, NY 11231",
    description: "A neighborhood tavern known for its dry-aged burger.",
    image: "/images/places/red-hook-tavern.webp",
    imageAlt: "Red Hook Tavern in Brooklyn",
    prompt: "Tell me about Red Hook Tavern and its burger.",
  },
  {
    name: "Ivan Ramen",
    category: "RAMEN",
    neighborhood: "Lower East Side",
    address: "25 Clinton St, New York, NY 10002",
    description: "A celebrated ramen shop bringing its own point of view to the LES.",
    image: "/images/places/ivan-ramen.webp",
    imageAlt: "Ivan Ramen on the Lower East Side",
    prompt: "Tell me about Ivan Ramen and what to order.",
  },
  {
    name: "Tompkins Square Bagels",
    category: "BAGEL",
    neighborhood: "East Village",
    address: "165 Avenue A, New York, NY 10009",
    description: "A lively neighborhood stop for a proper New York bagel.",
    image: "/images/places/tompkins-square-bagels.webp",
    imageAlt: "Tompkins Square Bagels in the East Village",
    prompt: "Tell me about Tompkins Square Bagels and what to get.",
  },
];

export function JustAskOck() {
  const eyebrowReveal = useScrollReveal({ duration: 600, once: false });
  const headingReveal = useScrollReveal({ delay: 75, duration: 600, once: false });
  const descriptionReveal = useScrollReveal({ delay: 145, duration: 600, once: false });
  const cardsReveal = useScrollReveal({ delay: 210, duration: 700, scale: 0.98, once: false });

  return (
    <section aria-labelledby="classics-heading" className="pb-9 sm:pb-11">
      <div className="mb-5">
        <p {...eyebrowReveal} className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#62666b]">A good place to start</p>
        <h2 {...headingReveal} id="classics-heading" className="text-[25px] font-semibold tracking-[-0.045em] text-[#151719] sm:text-[29px]">Start with the classics.</h2>
        <p {...descriptionReveal} className="mt-1.5 max-w-2xl text-sm leading-6 text-[#62666b]">Four NYC spots worth knowing. Ask Ock for something more your speed.</p>
      </div>

      <ul {...cardsReveal} className="home-place-list grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4">
        {classicPlaces.map((place, index) => (
          <li key={place.name} style={{ "--card-index": index } as CSSProperties}>
            <article className="home-place-card group h-full overflow-hidden rounded-[14px] border border-[#e1e3e0] bg-white">
              <div className="relative aspect-[16/10] overflow-hidden bg-[#e8e7e2]">
                <Image src={place.image} alt={place.imageAlt} fill sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 25vw" className="home-place-image object-cover" />
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-bold tracking-[0.12em] text-[#30363b]">{place.category}</span>
              </div>
              <div className="flex min-h-[190px] flex-col p-4 sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#626970]">{place.neighborhood}</p>
                <h3 className="mt-1 text-base font-semibold tracking-tight text-[#202529]">{place.name}</h3>
                <p className="mt-1 text-[11px] leading-4 text-[#687077]">{place.address}</p>
                <p className="mt-3 text-xs leading-5 text-[#4f575d]">{place.description}</p>
                <Link href={`/assistant?q=${encodeURIComponent(place.prompt)}`} prefetch={false} className="home-place-link mt-auto inline-flex w-fit items-center gap-1 pt-4 text-[11px] font-semibold text-[#0039A6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0039A6]">
                  Ask Ock <Icon name="arrow-right" size={14} className="home-place-arrow transition-transform duration-200" />
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[9px] leading-4 text-[#777d82]">MVP classics · place details and images are static demo content.</p>
    </section>
  );
}
