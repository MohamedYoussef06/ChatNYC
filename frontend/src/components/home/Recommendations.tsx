"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { TransitBadge } from "@/components/ui/TransitBadge";
import { RecommendationCard } from "@/components/home/RecommendationCard";
import { recommendations, categories, searchRecommendations, type Recommendation } from "@/lib/recommendations";

type RecommendationsProps = { query: string; onClearQuery: () => void };

export function Recommendations({ query, onClearQuery }: RecommendationsProps) {
  const [category, setCategory] = useState<string>("All picks");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedOnly, setSavedOnly] = useState(false);
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogOpener = useRef<HTMLElement | null>(null);
  const savedFilter = useRef<HTMLButtonElement>(null);
  const matches = (query.trim() ? searchRecommendations(query) : recommendations).filter(
    (place) => (category === "All picks" || place.category === category) && (!savedOnly || savedIds.has(place.id)),
  );

  useEffect(() => {
    if (!selected || !dialog.current) return;
    dialog.current.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [selected]);

  function toggleSave(id: string) {
    if (savedOnly && savedIds.has(id) && !selected) savedFilter.current?.focus();
    setSavedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openPlace(place: Recommendation) {
    dialogOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelected(place);
  }

  function closePlace() {
    const focusTarget = dialogOpener.current?.isConnected ? dialogOpener.current : savedFilter.current;
    focusTarget?.focus({ preventScroll: true });
    setSelected(null);
  }

  function resetFilters() {
    setCategory("All picks");
    setSavedOnly(false);
    onClearQuery();
  }

  return (
    <section id="recommendations" aria-labelledby="recommendations-heading" className="scroll-mt-28 border-t border-[#e4e5e2] pb-6 pt-9 sm:pb-8 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#656862]">Curated for your curiosity</p>
          <h2 id="recommendations-heading" className="text-[30px] font-semibold leading-tight tracking-[-0.045em] text-[#151719] sm:text-[36px]">Recommended for you</h2>
          <p className="mt-3 text-sm leading-6 text-[#656862]">Good places. Great stories. Your next favorite corner of the city.</p>
        </div>
        <button
          ref={savedFilter}
          type="button"
          onClick={() => setSavedOnly(!savedOnly)}
          aria-pressed={savedOnly}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition-colors ${savedOnly ? "border-[#0039A6] bg-[#eef3fc] text-[#0039A6]" : "border-[#dedfd9] bg-white text-[#383c37] hover:border-[#151719]"}`}
        >
          <Icon name="bookmark" size={15} /> Saved <span className="ml-1 tabular-nums">{savedIds.size}</span>
        </button>
      </div>

      <div role="group" aria-label="Filter recommendations by category" className="mt-7 flex gap-2 overflow-x-auto pb-3 sm:flex-wrap sm:pb-0">
        {["All picks", ...categories].map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
            className={`min-h-10 shrink-0 rounded-full border px-4 text-xs font-medium transition-colors ${category === item ? "border-[#151719] bg-[#151719] text-white" : "border-[#e0e1dc] bg-transparent text-[#555950] hover:border-[#858a80] hover:bg-white"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {query.trim() && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#d7e1f3] bg-[#f0f4fc] px-4 py-3 text-sm text-[#0039A6]">
          <span className="min-w-0 [overflow-wrap:anywhere]">Exploring: <strong className="font-semibold">{query}</strong></span>
          <button type="button" onClick={onClearQuery} className="inline-flex min-h-8 items-center gap-1.5 font-medium"><Icon name="close" size={14} /> Clear search</button>
        </div>
      )}
      <p role="status" className="sr-only">{matches.length} recommendations{savedOnly ? " in your saved places" : ""}.</p>

      {matches.length > 0 ? (
        <ul className="mt-7 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((place) => (
            <li key={place.id}>
              <RecommendationCard place={place} saved={savedIds.has(place.id)} onSave={() => toggleSave(place.id)} onOpen={() => openPlace(place)} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-7 rounded-2xl border border-dashed border-[#d3d6ce] bg-white px-6 py-14 text-center">
          <Icon name={savedOnly ? "bookmark" : "compass"} size={28} className="mx-auto mb-4 text-[#0039A6]" />
          <h3 className="text-xl font-semibold tracking-tight">{savedOnly && savedIds.size === 0 ? "Your next favorite is waiting." : "A little further off the beaten path."}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#656862]">{savedOnly && savedIds.size === 0 ? "Save a place using its bookmark, then find it here when you’re ready to explore." : "No picks match these filters yet. Try a neighborhood, a category, or browse all our NYC favorites."}</p>
          <button type="button" onClick={resetFilters} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0039A6] px-5 text-sm font-semibold text-white hover:bg-[#002d85]">See all picks <Icon name="arrow-right" size={16} /></button>
        </div>
      )}
      <p className="mt-6 text-center text-xs leading-5 text-[#656862]">A taste of what’s possible. Picks, prices, and travel times are illustrative.</p>

      <dialog
        ref={dialog}
        aria-labelledby="place-detail-title"
        onClose={closePlace}
        onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border-0 bg-white p-0 text-[#151719] shadow-xl backdrop:bg-black/50"
      >
        {selected && (
          <div>
            <div className="relative aspect-[1.8] bg-[#eeefeb]">
              <Image src={selected.image} alt={selected.imageAlt} fill sizes="512px" className="object-cover" />
              <button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Close place details" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#151719] shadow-sm"><Icon name="close" size={20} /></button>
            </div>
            <div className="p-6 sm:p-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#0039A6]">{selected.category}</p>
              <h2 id="place-detail-title" className="text-3xl font-semibold tracking-[-0.035em]">{selected.title}</h2>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-[#656862]"><Icon name="pin" size={15} />{selected.neighborhood}, {selected.borough}</p>
              <p className="mt-5 text-base leading-7 text-[#555950]">{selected.description}</p>
              <div className="my-6 space-y-3 border-y border-[#e4e5e2] py-5 text-sm">
                <div className="flex flex-wrap items-center gap-2"><span className="mr-1 font-medium">Nearby transit</span>{selected.lines?.map((line) => <TransitBadge key={line} line={line} small />)}<span className="text-[#656862]">{selected.station}</span></div>
                <p className="flex flex-wrap items-center gap-2 text-[#656862]"><Icon name="walk" size={17} className="shrink-0" />{selected.walk} <span aria-hidden="true">·</span> {selected.away}</p>
                {selected.accessible && <p className="flex items-center gap-2 text-[#656862]"><Icon name="accessible" size={17} />Step-free subway access nearby</p>}
                {selected.price && <p><span className="font-medium">Price</span><span className="ml-3 text-[#656862]">{selected.price}</span></p>}
              </div>
              <button type="button" onClick={() => toggleSave(selected.id)} aria-pressed={savedIds.has(selected.id)} aria-label={`${savedIds.has(selected.id) ? "Unsave" : "Save"} ${selected.title}`} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0039A6] px-5 text-sm font-semibold text-white hover:bg-[#002d85]"><Icon name={savedIds.has(selected.id) ? "check" : "bookmark"} size={18} />{savedIds.has(selected.id) ? "Saved to your places" : "Save this place"}</button>
              <p className="mt-4 text-center text-xs leading-5 text-[#656862]">A sample pick. Prices, travel times, and accessibility are illustrative.</p>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
