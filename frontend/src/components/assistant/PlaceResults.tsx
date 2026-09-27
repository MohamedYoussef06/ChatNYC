import { PlaceResultCard } from "@/components/assistant/PlaceResultCard";
import type { OckPlace } from "@/lib/ockMock";

export function PlaceResults({ eyebrow, title, subtitle, places, onAsk }: { eyebrow: string; title: string; subtitle: string; places: OckPlace[]; onAsk: (prompt: string) => void }) {
  return (
    <section className="p-4 sm:p-6 lg:p-7" aria-labelledby="ock-place-results-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[#e6e8e5] pb-4">
        <div>
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0039a6]">{eyebrow}</p>
          <h2 id="ock-place-results-heading" className="text-[23px] font-semibold leading-tight tracking-[-0.045em] text-[#151719] sm:text-[27px]">{title}</h2>
          <p className="mt-1.5 text-[11px] leading-5 text-[#697177]">{subtitle}</p>
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#72797e]">{places.length} places · demo</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
        {places.map((place) => <PlaceResultCard key={place.id} place={place} onAsk={onAsk} />)}
      </div>
    </section>
  );
}
