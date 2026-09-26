import { Icon } from "@/components/ui/Icon";
import type { TravelMode } from "@/components/citypilot/TripPlanner";

const breakdowns: Record<TravelMode, { primaryLabel: string; primaryMinutes: number; walkingMinutes: number; bufferMinutes: number; totalMinutes: number }> = {
  Transit: { primaryLabel: "Transit", primaryMinutes: 24, walkingMinutes: 9, bufferMinutes: 6, totalMinutes: 39 },
  Drive: { primaryLabel: "Driving", primaryMinutes: 31, walkingMinutes: 4, bufferMinutes: 8, totalMinutes: 43 },
  Walk: { primaryLabel: "Walking", primaryMinutes: 0, walkingMinutes: 52, bufferMinutes: 10, totalMinutes: 62 },
};

export function TripBreakdown({ mode }: { mode: TravelMode }) {
  const plan = breakdowns[mode];
  const rows = mode === "Walk"
    ? [["Walking", `${plan.walkingMinutes} min`], ["Safety buffer", `+${plan.bufferMinutes} min`], ["Total planned time", `${plan.totalMinutes} min`]]
    : [[plan.primaryLabel, `${plan.primaryMinutes} min`], ["Walking", `${plan.walkingMinutes} min`], ["Safety buffer", `+${plan.bufferMinutes} min`], ["Total planned time", `${plan.totalMinutes} min`]];
  const bufferExplanation = mode === "Transit"
    ? "CityPilot adds a small buffer so a delayed train or slower walk doesn't make you late."
    : mode === "Drive"
      ? "CityPilot adds a small buffer for pickup delays or slower traffic."
      : "CityPilot adds a small buffer in case the walk takes longer than expected.";

  return (
    <section aria-labelledby="trip-breakdown-heading" className="rounded-2xl border border-[#e1e3df] bg-white px-5 py-5 sm:px-6">
      <div className="flex items-center gap-2">
        <Icon name="clock" size={16} className="text-[#0039a6]" />
        <h2 id="trip-breakdown-heading" className="text-sm font-semibold text-[#202428]">Why leave then?</h2>
      </div>
      <dl className="mt-4 space-y-2.5">
        {rows.map(([label, value], index) => (
          <div key={label} className={`flex items-center justify-between gap-3 text-xs ${index === rows.length - 1 ? "border-t border-[#e6e8e4] pt-3 font-semibold text-[#202428]" : "text-[#5b6267]"}`}>
            <dt>{label}</dt><dd className="m-0 tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 rounded-lg bg-[#f4f6f8] px-3 py-2.5 text-[11px] leading-[1.55] text-[#5b6267]">{bufferExplanation}</p>
      <p className="mt-2 text-[9px] text-[#777d82]">Illustrative times only. Live conditions aren&apos;t connected.</p>
    </section>
  );
}
