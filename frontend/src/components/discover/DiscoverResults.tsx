import { DiscoverResultCard } from "@/components/discover/DiscoverResultCard";
import { Icon } from "@/components/ui/Icon";
import type { Recommendation } from "@/lib/recommendations";

export function DiscoverResults({ places, selectedId, savedIds, onSelect, onSave, onClearFilters }: {
  places: Recommendation[];
  selectedId: string | null;
  savedIds: Set<string>;
  onSelect: (place: Recommendation) => void;
  onSave: (id: string) => void;
  onClearFilters: () => void;
}) {
  return (
    <section aria-labelledby="discover-results-title" className="lg:h-[600px] lg:overflow-y-auto lg:pr-2">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e4e5e2] bg-[#faf9f6] py-3">
        <div>
          <h2 id="discover-results-title" className="text-sm font-semibold text-[#191c1e]">Places around the city</h2>
          <p className="mt-0.5 text-[10px] text-[#696e72]">{places.length} {places.length === 1 ? "place" : "places"} to explore</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#62666b]"><span className="size-1.5 rounded-full bg-[#008044]" /> Sample city picks</span>
      </div>

      {places.length ? (
        <ul className="m-0 grid list-none gap-2.5 p-0 pt-3">
          {places.map((place) => (
            <li key={place.id}>
              <DiscoverResultCard place={place} selected={selectedId === place.id} saved={savedIds.has(place.id)} onSelect={() => onSelect(place)} onSave={() => onSave(place.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[#d2d5d1] bg-white px-5 py-10 text-center">
          <Icon name="compass" size={25} className="mx-auto text-[#0039a6]" />
          <h3 className="mt-3 text-base font-semibold">No stops on this line yet.</h3>
          <p className="mx-auto mt-1.5 max-w-xs text-xs leading-5 text-[#62666b]">Try a different search or borough. These sample picks currently cover Manhattan and Brooklyn.</p>
          <button type="button" onClick={onClearFilters} className="mt-4 min-h-10 rounded-lg bg-[#0039a6] px-4 text-xs font-semibold text-white hover:bg-[#002d85]">Show all places</button>
        </div>
      )}
      <p className="py-3 text-[10px] leading-4 text-[#70757a]">Travel estimates and prices are illustrative.</p>
    </section>
  );
}
