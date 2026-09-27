import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { TransitBadge } from "@/components/ui/TransitBadge";
import type { Recommendation } from "@/lib/recommendations";

type RecommendationCardProps = {
  place: Recommendation;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
};

export function RecommendationCard({ place, saved, onSave, onOpen }: RecommendationCardProps) {
  return (
    <article className="group h-full overflow-hidden rounded-2xl border border-[#e4e5e2] bg-white transition-shadow hover:shadow-[0_8px_28px_rgba(21,23,25,0.07)]">
      <div className="relative aspect-[1.55] overflow-hidden bg-[#eeefeb]">
        <button type="button" onClick={onOpen} className="absolute inset-0 block h-full w-full focus-visible:z-10 focus-visible:outline-offset-[-4px]" aria-label={`Explore ${place.title}`}>
          <Image
            src={place.image}
            alt={place.imageAlt}
            fill
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
            className="object-cover"
          />
        </button>
        <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#151719]">
          {place.category}
        </span>
        <button
          type="button"
          onClick={onSave}
          aria-label={`${saved ? "Unsave" : "Save"} ${place.title}`}
          aria-pressed={saved}
          className={`absolute right-4 top-3.5 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-colors hover:bg-[#eef3fc] ${saved ? "text-[#0039A6]" : "text-[#151719]"}`}
        >
          <Icon name="bookmark" size={18} className={saved ? "fill-current" : ""} />
        </button>
      </div>
      <div className="p-5">
        <h3 className="text-xl font-semibold leading-tight tracking-[-0.025em] text-[#151719]">
          <button type="button" onClick={onOpen} className="flex w-full items-start justify-between gap-3 text-left hover:text-[#0039A6]">
            {place.title}
            <Icon name="arrow-up-right" size={19} className="mt-0.5 shrink-0 text-[#656862]" />
          </button>
        </h3>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-[#656862]">
          <Icon name="pin" size={13} className="shrink-0" />
          {place.neighborhood} <span aria-hidden="true">·</span> {place.borough}
        </p>
        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-[#656862]">{place.description}</p>
        <div className="mt-5 flex min-h-9 flex-wrap items-center justify-between gap-2 border-t border-[#e9eae6] pt-4">
          <div className="flex items-center gap-2.5">
            {place.lines && place.lines.length > 0 ? (
              <div className="flex items-center gap-1" aria-label="Nearby subway lines">
                {place.lines.map((line) => <TransitBadge key={line} line={line} small />)}
              </div>
            ) : (
              <Icon name="walk" size={16} className="text-[#656862]" />
            )}
            <span className="text-xs text-[#656862]">{place.away}</span>
          </div>
          {place.price && <span className="text-xs font-medium text-[#383c37]">{place.price}</span>}
        </div>
      </div>
    </article>
  );
}
