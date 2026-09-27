import { Icon } from "@/components/ui/Icon";
import type { RouteMode, RouteOption, RouteRecommendation } from "@/lib/route-metrics";

const labels = { Walk: "Walking", Drive: "Driving", Transit: "Transit" };
const icons = { Walk: "walk", Drive: "arrow-up-right", Transit: "route" } as const;
const minutes = (value: number | null) => value == null ? "Unknown" : `${Math.ceil(value)} min`;

export function RouteComparison({ options, selected, onSelect, recommendation, aiLoading, aiError }: {
  options: RouteOption[]; selected: RouteMode; onSelect: (mode: RouteMode) => void;
  recommendation: RouteRecommendation | null; aiLoading: boolean; aiError: string;
}) {
  if (!options.length) return null;
  return (
    <section aria-label="Compare travel modes" className="mb-4 space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const metrics = option.metrics;
          const recommended = recommendation?.mode === option.mode;
          return (
            <button key={option.mode} type="button" disabled={!metrics} aria-pressed={selected === option.mode} onClick={() => onSelect(option.mode)}
              className={`rounded-xl border p-3 text-left transition-colors disabled:opacity-65 ${selected === option.mode ? "border-[#0039a6] bg-[#eef3fb] ring-1 ring-[#0039a6]" : "border-[#dfe2e4] bg-white"}`}>
              <span className="flex items-center gap-2 text-sm font-semibold"><Icon name={icons[option.mode]} size={17} />{labels[option.mode]}</span>
              {recommended && <span className="mt-2 inline-block rounded-full bg-[#dcf2e4] px-2 py-1 text-[10px] font-bold text-[#17663b]">Grok recommended</span>}
              {metrics ? <>
                <span className="mt-2 block text-xl font-semibold">{minutes(metrics.durationMinutes)}</span>
                <span className="mt-1 block text-xs">{metrics.cost == null || !metrics.currency ? "Cost unknown" : new Intl.NumberFormat("en-US", { style: "currency", currency: metrics.currency }).format(metrics.cost)}</span>
                <span className="mt-1 block text-[10px] leading-4 text-[#62666b]">{metrics.costNote}</span>
                <span className="mt-2 block text-xs text-[#62666b]">{option.mode === "Transit" ? `${metrics.transfers} transfer${metrics.transfers === 1 ? "" : "s"} · ${minutes(metrics.walkingMinutes)} walking` : `${(metrics.distanceMeters / 1609.344).toFixed(1)} miles`}</span>
                {option.mode === "Transit" && <span className="mt-1 block text-[10px] text-[#62666b]">Transfer waits: {minutes(metrics.transferWaitMinutes)}</span>}
                {!metrics.canArriveOnTime && <span className="mt-2 block text-xs font-semibold text-[#b3261e]">Cannot meet arrival target</span>}
              </> : <span className="mt-2 block text-xs leading-5">{option.error}</span>}
            </button>
          );
        })}
      </div>
      {aiLoading && <p role="status" className="rounded-xl bg-[#eef3fb] p-3 text-xs text-[#0039a6]">Grok is comparing time, cost, walking, and transfers…</p>}
      {aiError && <p role="status" className="rounded-xl border border-[#e1e3df] bg-white p-3 text-xs leading-5 text-[#62666b]">{aiError}</p>}
      {recommendation && <div className="rounded-xl border border-[#c7e3d1] bg-[#f1f9f4] p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#17663b]"><Icon name="sparkles" size={17} />Grok recommends {labels[recommendation.mode].toLowerCase()}</p>
        <p className="mt-2 text-sm leading-6 text-[#303d34]">{recommendation.reason}</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-[#62666b]">{recommendation.tradeoffs.map((item, index) => <li key={index}>{item}</li>)}</ul>
      </div>}
    </section>
  );
}

export function RouteDetails({ option, origin, destination }: { option: RouteOption; origin: string; destination: string }) {
  if (!option.metrics) return null;
  const formatTime = (date?: Date) => date ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date) : "Unavailable";
  const steps = option.route?.legs?.flatMap((leg) => leg.steps) ?? [];
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${({ Walk: "walking", Drive: "driving", Transit: "transit" })[option.mode]}`;
  return <section className="mt-5 rounded-2xl border border-[#e1e3df] bg-white p-5">
    <h2 className="text-base font-semibold">{labels[option.mode]} route</h2>
    <dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-[#686e73]">Leave by, estimated</dt><dd className="mt-1 font-semibold">{formatTime(option.departure)}</dd></div><div><dt className="text-[#686e73]">Arrival, estimated</dt><dd className="mt-1 font-semibold">{formatTime(option.arrival)}</dd></div></dl>
    <p className="mt-3 text-[11px] leading-5 text-[#686e73]">Allow extra time. Driving estimates do not include finding parking. Transit transfer waits exclude waiting for the first vehicle.</p>
    {option.metrics.serviceHeadwayMinutes != null && <p className="mt-2 text-xs text-[#686e73]">Longest reported service interval: {minutes(option.metrics.serviceHeadwayMinutes)} between vehicles.</p>}
    {!!steps.length && <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-[#0039a6]">Route steps</summary><ol className="mt-3 list-decimal space-y-3 pl-5 text-xs leading-5">{steps.map((step, index) => <li key={index}>{step.transitDetails ? `${step.transitDetails.transitLine?.shortName ?? step.transitDetails.transitLine?.name ?? "Transit"}: ${step.transitDetails.departureStop?.name ?? "Board"} → ${step.transitDetails.arrivalStop?.name ?? "Get off"}` : step.instructions?.replace(/<[^>]*>/g, "") ?? "Continue along the route"}</li>)}</ol></details>}
    {option.route?.warnings?.map((warning, index) => <p key={index} className="mt-3 text-xs leading-5 text-[#8a4b00]">{warning}</p>)}
    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#0039a6]">Open directions in Google Maps ↗</a>
  </section>;
}
