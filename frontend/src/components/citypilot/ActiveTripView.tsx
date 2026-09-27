// Dormant legacy preview. Nothing on /navigate imports this. The instruction and progress below are sample copy, not a live trip.
import { Icon } from "@/components/ui/Icon";
import { TransitBadge } from "@/components/ui/TransitBadge";
import type { TravelMode } from "@/components/citypilot/TripPlanner";

export function ActiveTripView({ trip, onEnd }: {
  trip: { eta: string; destination: string; mode: TravelMode };
  onEnd: () => void;
}) {
  const instruction = trip.mode === "Transit"
    ? "Walk to 116 St, then take the downtown 1 train."
    : trip.mode === "Drive"
      ? "Head to your pickup point to begin the drive."
      : "Continue on foot toward your destination.";

  return (
    <section aria-labelledby="active-trip-title" className="rounded-2xl border border-[#e1e3df] bg-white p-5 shadow-[0_4px_18px_rgba(21,23,25,0.04)] sm:p-6">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-[#17663b]"><span className="size-2 rounded-full bg-[#23884f]" /> Trip preview in progress</div>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#62666b]">Current ETA</p>
      <h2 id="active-trip-title" className="mt-1 text-5xl font-semibold tracking-[-0.06em] text-[#151719]">{trip.eta}</h2>
      <p className="mt-1 text-xs text-[#62666b]">To {trip.destination}</p>

      <div className="mt-6 border-y border-[#e5e7e3] py-5">
        <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#656b70]">Next instruction</p>
        <p className="mt-2 flex items-start gap-2.5 text-sm font-medium leading-6 text-[#292e32]">
          {trip.mode === "Transit" ? <TransitBadge line="1" small /> : <Icon name={trip.mode === "Walk" ? "walk" : "arrow-up-right"} size={18} className="mt-0.5 shrink-0 text-[#0039a6]" />}
          {instruction}
        </p>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3 text-[10px] font-medium text-[#5d6469]"><span>Route progress</span><span>Preview · 1 of 4 steps</span></div>
        <div role="progressbar" aria-label="Illustrative route progress" aria-valuemin={0} aria-valuemax={4} aria-valuenow={1} className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8ebed]"><div className="h-full w-1/4 rounded-full bg-[#0039a6]" /></div>
      </div>

      <p className="mt-5 flex items-start gap-2 rounded-lg bg-[#f4f6f8] px-3 py-2.5 text-[10px] leading-5 text-[#626a70]"><Icon name="clock" size={15} className="mt-0.5 shrink-0 text-[#6c747a]" />Live GPS and service alerts are not connected in this trip preview.</p>
      <button type="button" onClick={onEnd} className="mt-5 min-h-11 w-full rounded-xl border border-[#d9dcd9] bg-white text-sm font-semibold text-[#42484d] hover:bg-[#f4f5f2]">Return to trip plan</button>
    </section>
  );
}
