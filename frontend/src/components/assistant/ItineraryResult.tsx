import Link from "next/link";
import { TextPlanForm } from "@/components/assistant/TextPlanForm";
import { Icon } from "@/components/ui/Icon";
import type { ItineraryStop, OckResultData } from "@/lib/ockMock";
import type { CSSProperties } from "react";

type Itinerary = Extract<OckResultData, { type: "itinerary" }>;

function ItineraryStopCard({ stop }: { stop: ItineraryStop }) {
  return (
    <article className="ock-itinerary-card flex min-w-0 items-start justify-between gap-3 rounded-[10px] border border-[#e5e7e4] bg-white px-3.5 py-3 sm:px-4">
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#0039a6]">{stop.category}</p>
        <h3 className="mt-1 text-[14px] font-semibold tracking-[-0.02em] text-[#202529]">{stop.name}</h3>
        <p className="mt-0.5 text-[10px] text-[#687076]">{stop.neighborhood}</p>
        {stop.note && <p className="mt-2 max-w-lg text-[10px] leading-4 text-[#72797e]">{stop.note}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="text-[10px] font-semibold text-[#333b40]">{stop.price}</span>
        <Link href={`/navigate?destination=${encodeURIComponent(stop.destination)}`} className="ock-secondary-action group inline-flex min-h-8 items-center gap-1 rounded-md border border-[#d9e0eb] bg-[#f7f9fc] px-2 text-[9px] font-semibold text-[#0039a6]">Get me there <Icon name="arrow-right" size={12} className="ock-action-arrow" /></Link>
      </div>
    </article>
  );
}

export function ItineraryResult({ itinerary, onPrompt, tripId, savingPlan = false }: { itinerary: Itinerary; onPrompt: (prompt: string) => void; tripId?: string | null; savingPlan?: boolean }) {
  const firstStop = itinerary.stops[0];
  return (
    <section aria-labelledby="ock-itinerary-heading" className="p-4 sm:p-6 lg:p-7">
      <div className="ock-result-header flex flex-wrap items-end justify-between gap-3 border-b border-[#e5e7e4] pb-4">
        <div>
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0039a6]">OCK BUILT THIS</p>
          <h2 id="ock-itinerary-heading" className="text-[24px] font-semibold leading-tight tracking-[-0.045em] text-[#151719] sm:text-[29px]">{itinerary.title}</h2>
          <p className="mt-1.5 text-[11px] text-[#697177]">{itinerary.area} · {itinerary.timeLabel}</p>
        </div>
        <span className="rounded-full border border-[#dce6df] bg-[#f7fbf8] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.11em] text-[#17663b]">Ready to go</span>
      </div>

      <ol className="mt-5 list-none p-0">
        {itinerary.stops.map((stop, index) => (
          <li key={stop.id} style={{ "--ock-card-index": index } as CSSProperties} className="ock-itinerary-item">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex w-[54px] shrink-0 flex-col items-center">
                <span className="text-[10px] font-bold tabular-nums text-[#343c41]">{stop.time}</span>
                <span className={`mt-2 size-3 rounded-full border-[3px] ${index === 0 ? "border-[#0039a6] bg-white" : index === 1 ? "border-[#008044] bg-white" : "border-[#151719] bg-[#151719]"}`} />
              </div>
              <div className="min-w-0 flex-1 pb-2"><ItineraryStopCard stop={stop} /></div>
            </div>
            {index < itinerary.stops.length - 1 && (
              <div className="ml-[24px] flex h-10 items-center gap-2 border-l border-dashed border-[#aebbd0] pl-7 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#747b80] sm:ml-[27px] sm:pl-8">
                <span aria-hidden="true">↓</span> {index === 0 ? "8 min walk" : "12 min walk"}
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="ock-result-summary mt-4 grid grid-cols-3 divide-x divide-[#e2e5e2] rounded-[10px] border border-[#e2e5e2] bg-[#fafaf7] py-3 text-center">
        <div><p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#7b8286]">Estimated total</p><p className="mt-1 text-sm font-bold text-[#202529]">{itinerary.total} <span className="text-[10px] font-medium text-[#777e83]">/ {itinerary.budget}</span></p></div>
        <div><p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#7b8286]">Stops</p><p className="mt-1 text-sm font-bold text-[#202529]">{itinerary.stops.length}</p></div>
        <div><p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#7b8286]">Neighborhoods</p><p className="mt-1 text-sm font-bold text-[#202529]">2</p></div>
      </div>
      <p className="mt-2 text-[9px] text-[#858b8f]">Illustrative places, prices, and timing · not live availability.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onPrompt("Make it cheaper")} className="ock-secondary-action inline-flex min-h-10 items-center gap-2 rounded-[8px] border border-[#d8dce0] bg-white px-3.5 text-[10px] font-semibold text-[#343b40]">Modify with Ock <Icon name="sparkles" size={13} /></button>
        {firstStop && <Link href={`/navigate?destination=${encodeURIComponent(firstStop.destination)}`} className="ock-primary-action group inline-flex min-h-10 items-center gap-2 rounded-[8px] bg-[#0039a6] px-4 text-[10px] font-semibold text-white">Start the night <Icon name="arrow-right" size={14} className="ock-action-arrow" /></Link>}
      </div>
      <TextPlanForm tripId={tripId ?? null} saving={savingPlan} />
    </section>
  );
}
