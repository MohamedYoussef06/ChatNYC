"use client";

import { useMemo, useState } from "react";
import { DiscoverFilters, type BoroughFilter, type CategoryFilter } from "@/components/discover/DiscoverFilters";
import { DiscoverHeader } from "@/components/discover/DiscoverHeader";
import { DiscoverMap } from "@/components/discover/DiscoverMap";
import { DiscoverResults } from "@/components/discover/DiscoverResults";
import { PlaceDetailPanel } from "@/components/discover/PlaceDetailPanel";
import { recommendations, searchRecommendations, type Recommendation } from "@/lib/recommendations";

export function ExplorePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("For You");
  const [borough, setBorough] = useState<BoroughFilter>("All boroughs");
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [mapView, setMapView] = useState(false);

  const places = useMemo(() => {
    return searchRecommendations(query).filter((place) =>
      (category === "For You" || place.category === category) &&
      (borough === "All boroughs" || place.borough === borough),
    );
  }, [borough, category, query]);

  function toggleSave(id: string) {
    setSavedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="relative left-1/2 w-screen max-w-none -translate-x-1/2 px-5 pb-10 sm:px-8 xl:px-12 2xl:px-16">
      <div className="mx-auto max-w-[1760px]">
        <DiscoverHeader query={query} onQueryChange={setQuery} />
        <DiscoverFilters category={category} onCategoryChange={setCategory} borough={borough} onBoroughChange={setBorough} />

        <div className="mb-3 mt-5 flex justify-end lg:hidden">
          <div role="group" aria-label="Choose results or map view" className="inline-flex rounded-lg border border-[#d9dcd9] bg-white p-1">
            <button type="button" onClick={() => setMapView(false)} aria-pressed={!mapView} className={`min-h-9 rounded-md px-3 text-xs font-semibold ${!mapView ? "bg-[#151719] text-white" : "text-[#555a60]"}`}>Results</button>
            <button type="button" onClick={() => setMapView(true)} aria-pressed={mapView} className={`min-h-9 rounded-md px-3 text-xs font-semibold ${mapView ? "bg-[#151719] text-white" : "text-[#555a60]"}`}>Map view</button>
          </div>
        </div>

        <section aria-label="Explore NYC places" className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-6">
          <div className={mapView ? "hidden lg:block" : "block"}>
            <DiscoverResults
              places={places}
              selectedId={selected?.id ?? null}
              savedIds={savedIds}
              onSelect={setSelected}
              onSave={toggleSave}
              onClearFilters={() => { setQuery(""); setCategory("For You"); setBorough("All boroughs"); }}
            />
          </div>
          <div className={mapView ? "block" : "hidden lg:block"}>
            <DiscoverMap />
          </div>
        </section>

        <PlaceDetailPanel place={selected} saved={selected ? savedIds.has(selected.id) : false} onClose={() => setSelected(null)} onSave={() => selected && toggleSave(selected.id)} />
      </div>
    </div>
  );
}
