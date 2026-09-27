import { Icon } from "@/components/ui/Icon";
import type { RouteMode, RouteOption, RouteRecommendation } from "@/lib/route-metrics";
import type { CSSProperties } from "react";

const labels = { Walk: "Walking", Drive: "Driving", Transit: "Transit" };
const cardLabels = { Walk: "Walk", Drive: "Drive", Transit: "Transit" };
const icons = { Walk: "walk", Drive: "arrow-up-right", Transit: "route" } as const;
const comparisonOrder: RouteMode[] = ["Transit", "Drive", "Walk"];
const minutes = (value: number | null) => value == null ? "—" : `${Math.ceil(value)} min`;

export function RouteComparison({ options, selected, onSelect, recommendation, aiLoading, aiError }: {
  options: RouteOption[]; selected: RouteMode; onSelect: (mode: RouteMode) => void;
  recommendation: RouteRecommendation | null; aiLoading: boolean; aiError: string;
}) {
  if (!options.length) return null;
  const orderedOptions = comparisonOrder.flatMap((mode) => options.filter((option) => option.mode === mode));
  return (
    <section aria-label="Compare travel modes" className="nextstop-results mb-4 space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {orderedOptions.map((option, index) => {
          const metrics = option.metrics;
          const recommended = recommendation?.mode === option.mode;
          return (
            <button key={option.mode} type="button" aria-pressed={selected === option.mode} onClick={() => onSelect(option.mode)}
              style={{ "--nextstop-result-index": index } as CSSProperties}
              className={`nextstop-result-card rounded-xl border p-3 text-left ${selected === option.mode ? "border-[#0039a6] bg-[#eef3fb] ring-1 ring-[#0039a6]" : "border-[#dfe2e4] bg-white"}`}>
              <span className="flex items-center gap-2 text-sm font-semibold"><Icon name={icons[option.mode]} size={17} />{cardLabels[option.mode]}</span>
              {recommended && <span className="mt-2 inline-block rounded-full bg-[#dcf2e4] px-2 py-1 text-[10px] font-bold text-[#17663b]">Grok recommended</span>}
              {metrics ? <>
                <span className="mt-2 block text-xl font-semibold">{minutes(metrics.durationMinutes)}</span>
                <span className="mt-1 block text-xs">{metrics.cost == null || !metrics.currency ? "Cost unknown" : new Intl.NumberFormat("en-US", { style: "currency", currency: metrics.currency }).format(metrics.cost)}</span>
                <span className="mt-1 block text-[10px] leading-4 text-[#62666b]">{metrics.costNote}</span>
                <span className="mt-2 block text-xs text-[#62666b]">{option.mode === "Transit" ? `${metrics.transfers} transfer${metrics.transfers === 1 ? "" : "s"} · ${minutes(metrics.walkingMinutes)} walking` : `${(metrics.distanceMeters / 1609.344).toFixed(1)} miles`}</span>
                {option.mode === "Transit" && <span className="mt-1 block text-[10px] text-[#62666b]">Transfer waits: {minutes(metrics.transferWaitMinutes)}</span>}
                {!metrics.canArriveOnTime && <span className="mt-2 block text-xs font-semibold text-[#b3261e]">Cannot meet arrival target</span>}
              </> : <><span className="mt-2 block text-xl font-semibold">—</span><span className="mt-1 block text-xs leading-5 text-[#62666b]">{option.error ?? "Route data unavailable"}</span></>}
            </button>
          );
        })}
      </div>
      {aiLoading && <p role="status" className="nextstop-result-enter rounded-xl bg-[#eef3fb] p-3 text-xs text-[#0039a6]">Grok is comparing time, cost, walking, and transfers…</p>}
      {aiError && <p role="status" className="nextstop-result-enter rounded-xl border border-[#e1e3df] bg-white p-3 text-xs leading-5 text-[#62666b]">{aiError}</p>}
      {recommendation && <div className="nextstop-result-enter rounded-xl border border-[#c7e3d1] bg-[#f1f9f4] p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#17663b]"><Icon name="sparkles" size={17} />Grok recommends {labels[recommendation.mode].toLowerCase()}</p>
        <p className="mt-2 text-sm leading-6 text-[#303d34]">{recommendation.reason}</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-[#62666b]">{recommendation.tradeoffs.map((item, index) => <li key={index}>{item}</li>)}</ul>
      </div>}
    </section>
  );
}
