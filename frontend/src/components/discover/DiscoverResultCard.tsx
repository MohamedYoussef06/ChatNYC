import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { TransitBadge } from "@/components/ui/TransitBadge";
import type { Recommendation } from "@/lib/recommendations";

export function DiscoverResultCard({ place, selected, saved, onSelect, onSave }: {
  place: Recommendation;
  selected: boolean;
  saved: boolean;
  onSelect: () => void;
  onSave: () => void;
}) {
  return (
    <article className={`relative overflow-hidden rounded-xl border bg-white transition-colors ${selected ? "border-[#0039a6] ring-1 ring-[#0039a6]" : "border-[#e1e3df] hover:border-[#aeb8c9]"}`}>
      <button type="button" onClick={onSelect} aria-pressed={selected} aria-label={`View ${place.title} details`} className="grid w-full grid-cols-[112px_minmax(0,1fr)] text-left sm:grid-cols-[128px_minmax(0,1fr)] xl:grid-cols-[144px_minmax(0,1fr)]">
        <span className="relative block min-h-[172px] overflow-hidden bg-[#e9e9e4] sm:min-h-[176px]">
          <Image src={place.image} alt={place.imageAlt} fill sizes="(max-width: 639px) 112px, (max-width: 1279px) 128px, 144px" className="object-cover" />
        </span>
        <span className="flex min-w-0 flex-col py-3 pl-3 pr-10 sm:py-3.5 sm:pl-4 sm:pr-11">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0039a6]">{place.category}</span>
          <span className="mt-1 line-clamp-1 text-[15px] font-semibold leading-5 tracking-[-0.015em] text-[#191c1e] sm:text-base">{place.title}</span>
          <span className="mt-1 flex items-center gap-1 text-[11px] text-[#62666b] sm:text-xs">
            <Icon name="pin" size={13} className="shrink-0 text-[#0039a6]" />
            <span className="truncate">{place.neighborhood}, {place.borough}</span>
          </span>
          <span className="mt-2 line-clamp-2 text-xs leading-[1.5] text-[#5d6266] sm:text-[13px]">{place.description}</span>
          <span className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1.5 pt-2.5">
            {place.lines?.length ? <span className="flex items-center gap-1">{place.lines.map((line) => <TransitBadge key={line} line={line} small />)}</span> : null}
            <span className="text-[11px] font-medium text-[#4d5256] sm:text-xs">{place.away}</span>
            {place.price && <span className="border-l border-[#dfe1dd] pl-2.5 text-[11px] font-semibold text-[#4d5256] sm:text-xs">{place.price}</span>}
          </span>
        </span>
      </button>
      <button type="button" onClick={onSave} aria-label={`${saved ? "Remove" : "Save"} ${place.title}`} aria-pressed={saved} className={`absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-full border border-[#e3e5e1] bg-white shadow-sm hover:bg-[#f0f4fc] ${saved ? "text-[#0039a6]" : "text-[#5c6267]"}`}>
        <Icon name="bookmark" size={15} className={saved ? "fill-current" : ""} />
      </button>
    </article>
  );
}
