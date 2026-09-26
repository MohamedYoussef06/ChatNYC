import { Icon } from "@/components/ui/Icon";

export function MemoryPanel({ preferences, compact = false }: { preferences: string[]; compact?: boolean }) {
  const headingPrefix = compact ? "mobile" : "desktop";

  return (
    <div className={`flex flex-col gap-4 ${compact ? "" : "h-[min(74dvh,820px)] min-h-[590px]"}`}>
      <section aria-labelledby={`${headingPrefix}-ock-knows-heading`} className="rounded-2xl border border-[#e0e3df] bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#eef3fb] text-[#0039a6]"><Icon name="sparkles" size={17} /></span>
          <div><h2 id={`${headingPrefix}-ock-knows-heading`} className="text-sm font-semibold text-[#202428]">Ock knows</h2><p className="text-[9px] text-[#70767b]">A little about your NYC style</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Demo preferences">
          {preferences.map((preference) => <span key={preference} className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#dce2e8] bg-[#f7f9fb] px-3 text-[10px] font-medium text-[#39434b]"><span className="size-1.5 rounded-full bg-[#0039a6]" />{preference}</span>)}
        </div>
        <p className="mt-4 text-[11px] leading-[1.65] text-[#636b71]">Ock learns from what you tell it and uses those preferences to improve future recommendations.</p>
        <p className="mt-2 text-[9px] font-medium text-[#777e83]">Demo memory · not saved between visits</p>
      </section>

      <section aria-labelledby={`${headingPrefix}-ock-today-heading`} className="flex-1 rounded-2xl border border-[#e0e3df] bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#f4f2e9] text-[#896d14]"><Icon name="sun" size={17} /></span>
          <div><h2 id={`${headingPrefix}-ock-today-heading`} className="text-sm font-semibold text-[#202428]">Today</h2><p className="text-[9px] text-[#70767b]">Your day around the city</p></div>
        </div>
        <div className="mt-5 rounded-xl border border-dashed border-[#dce0dd] bg-[#fbfbf8] px-4 py-6 text-center">
          <Icon name="route" size={21} className="mx-auto text-[#7a858c]" />
          <p className="mt-2 text-xs font-semibold text-[#3a4146]">No plans yet.</p>
          <p className="mt-1 text-[10px] leading-5 text-[#697177]">Ask Ock to build your day.</p>
        </div>
      </section>
    </div>
  );
}
