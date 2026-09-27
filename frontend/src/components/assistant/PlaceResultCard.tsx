import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { TransitBadge } from "@/components/ui/TransitBadge";
import type { OckPlace } from "@/lib/ockMock";

export function PlaceResultCard({ place, onAsk }: { place: OckPlace; onAsk: (prompt: string) => void }) {
  const destination = place.address ? `${place.name}, ${place.address}` : place.name;

  return (
    <article className="overflow-hidden rounded-[13px] border border-[#e1e4e1] bg-white">
      <div className="relative aspect-[16/10] overflow-hidden bg-[#e9e8e3]">
        <Image src={place.photoUrl ?? place.imagePath} alt={`${place.name}${place.neighborhood ? ` in ${place.neighborhood}` : ""}`} fill sizes="(max-width: 639px) 88vw, (max-width: 1023px) 45vw, 24vw" className="object-cover" />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-bold tracking-[0.12em] text-[#30363b]">{place.category}</span>
        {place.price && <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-[#30363b]">{place.price}</span>}
      </div>
      <div className="p-3.5 sm:p-4">
        <h3 className="text-[15px] font-semibold leading-5 tracking-[-0.02em] text-[#202529]">{place.name}</h3>
        <p className="mt-1 text-[10px] font-medium text-[#697177]">{place.neighborhood}{place.borough ? ` · ${place.borough}` : ""}</p>
        {place.address && <p className="mt-1 text-[10px] leading-4 text-[#777e83]">{place.address}</p>}
        <p className="mt-2.5 min-h-[42px] text-[11px] leading-[1.55] text-[#535b60]">{place.reason}</p>
        <div className="mt-3 flex min-h-5 items-center gap-1.5">
          {place.subwayLines?.map((line) => <TransitBadge key={line} line={line} small />)}
          {place.station && <span className="ml-1 text-[9px] text-[#697177]">{place.station}</span>}
          {place.travelTime && <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-medium text-[#535b60]"><Icon name="clock" size={12} />{place.travelTime}</span>}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#eaebe8] pt-2.5">
          <button type="button" onClick={() => onAsk(`Tell me more about ${place.name}.`)} className="min-h-9 rounded-md px-2 text-[10px] font-semibold text-[#40484d] hover:bg-[#f1f3f2]">Ask Ock</button>
          <Link href={`/navigate?destination=${encodeURIComponent(destination)}`} className="inline-flex min-h-9 items-center gap-1 rounded-[7px] bg-[#0039a6] px-2.5 text-[10px] font-semibold text-white hover:bg-[#002d85]">Get me there <Icon name="arrow-right" size={13} /></Link>
        </div>
      </div>
    </article>
  );
}
