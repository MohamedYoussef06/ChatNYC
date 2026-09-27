import Link from "next/link";
import { ItineraryResult } from "@/components/assistant/ItineraryResult";
import { OckEmptyState } from "@/components/assistant/OckEmptyState";
import { PlaceResults } from "@/components/assistant/PlaceResults";
import { Icon } from "@/components/ui/Icon";
import type { OckMockResponse } from "@/lib/ockMock";

export function OckResultWorkspace({ response, onPrompt }: { response: OckMockResponse; onPrompt: (prompt: string) => void }) {
  if (response.data.type === "empty") return <OckEmptyState onPrompt={onPrompt} />;
  if (response.data.type === "places") return <PlaceResults eyebrow={`OCK FOUND ${response.data.places.length}`} title={response.data.title} subtitle={response.data.subtitle} places={response.data.places} onAsk={onPrompt} />;
  if (response.data.type === "activity") return <PlaceResults eyebrow="OCK IDEAS" title={response.data.title} subtitle={response.data.subtitle} places={response.data.places} onAsk={onPrompt} />;
  if (response.data.type === "itinerary") return <ItineraryResult itinerary={response.data} onPrompt={onPrompt} />;

  return (
    <section className="flex min-h-[530px] flex-col items-start justify-center p-5 sm:p-8 lg:p-10" aria-labelledby="ock-handoff-heading">
      <span className="flex size-11 items-center justify-center rounded-full bg-[#eef3fb] text-[#0039a6]"><Icon name="route" size={21} /></span>
      <p className="mt-5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#0039a6]">NEXTSTOP HANDOFF</p>
      <h2 id="ock-handoff-heading" className="mt-1 text-[26px] font-semibold tracking-[-0.04em] text-[#151719]">{response.data.destination}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#626a70]">{response.data.message}</p>
      <Link href={`/navigate?destination=${encodeURIComponent(response.data.destination)}`} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-[9px] bg-[#0039a6] px-4 text-xs font-semibold text-white hover:bg-[#002d85]">Plan when to leave <Icon name="arrow-right" size={15} /></Link>
      <p className="mt-3 text-[9px] text-[#7b8286]">NextStop will use this destination as the trip endpoint.</p>
    </section>
  );
}
