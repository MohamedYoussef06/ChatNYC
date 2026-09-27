import { Icon } from "@/components/ui/Icon";
import type { CSSProperties } from "react";

const starterPrompts = [
  "Cheap date tonight",
  "Live music under $30",
  "Build my Saturday",
  "Somewhere I’ve never been",
  "Best food near Columbia",
];

export function OckEmptyState({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  return (
    <section aria-labelledby="ock-empty-heading" className="flex min-h-[530px] flex-col justify-center p-5 sm:p-8 lg:p-10">
      <p className="ock-empty-step ock-empty-eyebrow mb-3 inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#0039a6]"><span className="size-1.5 rounded-full bg-[#0039a6]" /> Your next move starts here</p>
      <h2 id="ock-empty-heading" className="ock-empty-step ock-empty-title max-w-2xl text-[32px] font-semibold leading-[1.05] tracking-[-0.055em] text-[#151719] sm:text-[42px]">What are we getting into?</h2>
      <p className="ock-empty-step ock-empty-copy mt-3 max-w-xl text-sm leading-6 text-[#656c71]">Tell Ock what kind of day, place, food, event, or experience you&apos;re looking for.</p>

      <div className="ock-empty-step ock-empty-prompts mt-8 max-w-3xl">
        <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.13em] text-[#777e83]">A few good starting points</p>
        <div className="flex flex-wrap gap-2">
          {starterPrompts.map((prompt, index) => (
            <button key={prompt} type="button" onClick={() => onPrompt(prompt)} style={{ "--ock-chip-index": index } as CSSProperties} className="ock-chip ock-starter-chip group inline-flex min-h-10 items-center gap-2 rounded-full border border-[#dce0dd] bg-[#fffefa] px-3.5 text-[11px] font-medium text-[#343b40]">
              <span className={`size-2 rounded-full ${index === 0 ? "bg-[#d52e29]" : index === 1 ? "bg-[#008044]" : index === 2 ? "bg-[#fccc0a]" : index === 3 ? "bg-[#ff6319]" : "bg-[#0039a6]"}`} aria-hidden="true" />
              {prompt}<Icon name="arrow-right" size={13} className="ock-chip-arrow text-[#81878b]" />
            </button>
          ))}
        </div>
      </div>

      <div className="ock-empty-step ock-empty-nav mt-10 flex items-center gap-2 border-t border-[#e7e9e6] pt-4 text-[9px] font-medium uppercase tracking-[0.1em] text-[#83898d]">
        <span className="size-2 rounded-full bg-[#0039a6]" /> Places <span className="mx-1 h-px w-7 bg-[#d6dad8]" /> Itineraries <span className="mx-1 h-px w-7 bg-[#d6dad8]" /> NextStop handoff
      </div>
    </section>
  );
}
