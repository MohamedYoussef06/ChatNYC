import { Icon } from "@/components/ui/Icon";

export type TravelMode = "Transit" | "Drive" | "Walk";

const modes: { label: TravelMode; icon: "route" | "arrow-up-right" | "walk" }[] = [
  { label: "Transit", icon: "route" },
  { label: "Drive", icon: "arrow-up-right" },
  { label: "Walk", icon: "walk" },
];

export function TripPlanner({ origin, destination, arriveByDate, arriveByTime, travelMode, onOriginChange, onDestinationChange, onArriveByDateChange, onArriveByTimeChange, onTravelModeChange, onPlan }: {
  origin: string;
  destination: string;
  arriveByDate: string;
  arriveByTime: string;
  travelMode: TravelMode;
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onArriveByDateChange: (value: string) => void;
  onArriveByTimeChange: (value: string) => void;
  onTravelModeChange: (value: TravelMode) => void;
  onPlan: () => void;
}) {
  return (
    <form onSubmit={(event) => { event.preventDefault(); onPlan(); }} className="rounded-2xl border border-[#e1e3df] bg-white p-5 shadow-[0_4px_18px_rgba(21,23,25,0.04)] sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#ecece8] pb-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-[#191c1e]">Plan your arrival</h2>
          <p className="mt-1 text-xs text-[#686e73]">We&apos;ll work backwards from your deadline.</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-full bg-[#eef3fb] text-[#0039a6]"><Icon name="route" size={19} /></span>
      </div>

      <div className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-3 gap-y-4">
        <div aria-hidden="true" className="row-span-2 flex flex-col items-center py-9">
          <span className="size-2.5 shrink-0 rounded-full border-2 border-[#0039a6] bg-white" />
          <span className="w-px flex-1 border-l border-dashed border-[#aebbd0]" />
          <span className="size-2.5 shrink-0 rounded-full bg-[#151719] ring-2 ring-white" />
        </div>
        <div>
          <label htmlFor="citypilot-origin" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#62666b]">From</label>
          <div className="flex h-12 items-center gap-2.5 rounded-lg border border-[#d9dcd9] bg-[#fff] px-3 focus-within:border-[#0039a6] focus-within:ring-2 focus-within:ring-[#0039a6]/10">
            <Icon name="pin" size={17} className="shrink-0 text-[#0039a6]" />
            <input id="citypilot-origin" required value={origin} onChange={(event) => onOriginChange(event.target.value)} placeholder="Starting location" autoComplete="street-address" className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#191c1e] outline-none placeholder:text-[#858a8e]" />
          </div>
        </div>
        <div>
          <label htmlFor="citypilot-destination" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#62666b]">To</label>
          <div className="flex h-12 items-center gap-2.5 rounded-lg border border-[#d9dcd9] bg-[#fff] px-3 focus-within:border-[#0039a6] focus-within:ring-2 focus-within:ring-[#0039a6]/10">
            <Icon name="pin" size={17} className="shrink-0 text-[#d52e29]" />
            <input id="citypilot-destination" required value={destination} onChange={(event) => onDestinationChange(event.target.value)} placeholder="Where are you going?" autoComplete="off" className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#191c1e] outline-none placeholder:text-[#858a8e]" />
          </div>
        </div>
      </div>

      <fieldset className="mt-6">
        <legend className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#62666b]">Arrive by</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="min-w-0">
            <span className="sr-only">Arrival date</span>
            <input type="date" required value={arriveByDate} onChange={(event) => onArriveByDateChange(event.target.value)} className="h-12 w-full rounded-lg border border-[#d9dcd9] bg-white px-3 text-sm text-[#24282c] outline-none focus:border-[#0039a6] focus:ring-2 focus:ring-[#0039a6]/10" />
          </label>
          <label className="min-w-0">
            <span className="sr-only">Arrival time</span>
            <input type="time" required value={arriveByTime} onChange={(event) => onArriveByTimeChange(event.target.value)} className="h-12 w-full rounded-lg border border-[#d9dcd9] bg-white px-3 text-sm text-[#24282c] outline-none focus:border-[#0039a6] focus:ring-2 focus:ring-[#0039a6]/10" />
          </label>
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#62666b]">How are you getting there?</legend>
        <div className="grid grid-cols-3 gap-2">
          {modes.map((mode) => {
            const active = travelMode === mode.label;
            return (
              <button key={mode.label} type="button" aria-pressed={active} onClick={() => onTravelModeChange(mode.label)} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-2 text-xs font-semibold transition-colors ${active ? "border-[#0039a6] bg-[#eef3fb] text-[#0039a6]" : "border-[#e0e2de] bg-white text-[#565c61] hover:border-[#aeb8c9]"}`}>
                <Icon name={mode.icon} size={15} />{mode.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <button type="submit" className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0039a6] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#002d85]">Plan my trip <Icon name="arrow-right" size={17} /></button>
      <p className="mt-3 text-center text-[10px] leading-4 text-[#777c81]">A sample plan using illustrative travel times and buffers.</p>
    </form>
  );
}
