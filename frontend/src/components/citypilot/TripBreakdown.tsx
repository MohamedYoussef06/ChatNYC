import { RouteWeatherSection } from "@/components/citypilot/RouteWeather";
import { Icon } from "@/components/ui/Icon";
import type { TripLocation } from "@/lib/location-suggestions";
import { unavailableRouteCost, type RouteCostItem, type RouteOption } from "@/lib/route-metrics";
import type { RouteWeather } from "@/lib/weather";

const modeLabels = { Transit: "Transit", Drive: "Drive", Walk: "Walk" } as const;
const modeIcons = { Transit: "route", Drive: "arrow-up-right", Walk: "walk" } as const;

function formatTime(value?: Date) {
  return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(value) : "—";
}

function formatMinutes(value?: number | null) {
  return value == null ? "—" : `${Math.ceil(value)} min`;
}

function formatDistance(value?: number | null) {
  return value == null ? "—" : `${(value / 1609.344).toFixed(1)} mi`;
}

function formatCost(item: RouteCostItem) {
  if (item.amount == null || !item.currency) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: item.currency }).format(item.amount);
}

function stepLabel(step: google.maps.routes.RouteLegStep) {
  if (step.transitDetails) {
    const line = step.transitDetails.transitLine?.shortName ?? step.transitDetails.transitLine?.name ?? "Transit";
    const start = step.transitDetails.departureStop?.name ?? "Boarding stop unavailable";
    const end = step.transitDetails.arrivalStop?.name ?? "Arrival stop unavailable";
    return `${line}: ${start} → ${end}`;
  }
  return step.instructions?.replace(/<[^>]*>/g, "") || "Step details unavailable";
}

export function TripBreakdown({ option, origin, destination, onEdit, weatherStatus = "unavailable", weather }: {
  option: RouteOption;
  origin: TripLocation;
  destination: TripLocation;
  onEdit: () => void;
  weatherStatus?: "loading" | "ready" | "unavailable";
  weather?: RouteWeather;
}) {
  const metrics = option.metrics;
  const cost = metrics?.costDetails ?? unavailableRouteCost(option.mode);
  const steps = option.route?.legs?.flatMap((leg) => leg.steps) ?? [];
  const travelTimeLabel = option.mode === "Walk" ? "Walking time" : "Estimated travel time";

  return (
    <section aria-labelledby="trip-breakdown-heading" className="nextstop-route-details nextstop-sidebar-enter rounded-2xl border border-[#e1e3df] bg-white p-5 shadow-[0_4px_18px_rgba(21,23,25,0.04)] sm:p-6">
      <div className="flex items-start justify-between gap-4 border-b border-[#ecece8] pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0039a6]">Selected route</p>
          <h2 id="trip-breakdown-heading" className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-[-0.035em] text-[#191c1e]"><Icon name={modeIcons[option.mode]} size={18} />{modeLabels[option.mode]}</h2>
        </div>
        <button type="button" onClick={onEdit} className="nextstop-edit-trip min-h-10 rounded-lg border border-[#d9dcd9] px-3 text-xs font-semibold text-[#0039a6]">Edit trip</button>
      </div>

      <dl className="mt-5 space-y-3 text-xs">
        <div><dt className="text-[9px] font-bold uppercase tracking-[0.11em] text-[#73797e]">From</dt><dd className="mt-1 font-semibold leading-5 text-[#282d31]">{origin.label || "—"}</dd></div>
        <div><dt className="text-[9px] font-bold uppercase tracking-[0.11em] text-[#73797e]">To</dt><dd className="mt-1 font-semibold leading-5 text-[#282d31]">{destination.label || "—"}</dd></div>
      </dl>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-[#eceeeb] py-5 text-xs">
        <div><dt className="text-[#686e73]">Leave at</dt><dd className="mt-1 font-semibold tabular-nums">{formatTime(option.departure)}</dd></div>
        <div><dt className="text-[#686e73]">Arrive by</dt><dd className="mt-1 font-semibold tabular-nums">{formatTime(option.arrival)}</dd></div>
        <div><dt className="text-[#686e73]">{travelTimeLabel}</dt><dd className="mt-1 font-semibold tabular-nums">{formatMinutes(metrics?.durationMinutes)}</dd></div>
        <div><dt className="text-[#686e73]">Safety / buffer time</dt><dd className="mt-1 font-semibold tabular-nums">{formatMinutes(option.bufferMinutes)}</dd></div>
        {(option.mode === "Drive" || option.mode === "Walk") && <div><dt className="text-[#686e73]">Distance</dt><dd className="mt-1 font-semibold tabular-nums">{formatDistance(metrics?.distanceMeters)}</dd></div>}
        {option.mode === "Transit" && <div><dt className="text-[#686e73]">Transfers</dt><dd className="mt-1 font-semibold tabular-nums">{metrics ? metrics.transfers : "—"}</dd></div>}
      </dl>

      <RouteWeatherSection mode={option.mode} status={weatherStatus} weather={weather ?? option.weather} />

      <section aria-labelledby="route-steps-heading" className="mt-5">
        <h3 id="route-steps-heading" className="text-sm font-semibold">Route</h3>
        {steps.length ? <ol className="mt-3 list-decimal space-y-3 pl-5 text-xs leading-5 text-[#4f565b]">{steps.map((step, index) => <li key={index}>{stepLabel(step)}</li>)}</ol> : <p className="mt-2 text-xs text-[#747b80]">Awaiting route data.</p>}
      </section>

      <section aria-labelledby="route-cost-heading" className="mt-6 border-t border-[#eceeeb] pt-5">
        <h3 id="route-cost-heading" className="text-sm font-semibold">{option.mode === "Transit" ? "Fare breakdown" : option.mode === "Drive" ? "Cost breakdown" : "Cost"}</h3>
        <dl className="mt-3 space-y-2.5">
          {cost.items.map((item) => <div key={item.label} className="flex items-center justify-between gap-4 text-xs"><dt className="text-[#62696e]">{item.label}</dt><dd className="font-semibold tabular-nums">{formatCost(item)}</dd></div>)}
          <div className="flex items-center justify-between gap-4 border-t border-[#eceeeb] pt-3 text-xs font-semibold"><dt>{option.mode === "Transit" ? "Fare" : option.mode === "Drive" ? "Total estimated cost" : "Total"}</dt><dd className="tabular-nums">{cost.total == null || !cost.currency ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: cost.currency }).format(cost.total)}</dd></div>
        </dl>
        <p className="mt-3 text-[10px] leading-4 text-[#747b80]">{cost.note}</p>
      </section>

      {!metrics && <p role="status" className="mt-5 rounded-lg bg-[#f4f5f2] px-3 py-2.5 text-xs leading-5 text-[#62696e]">{option.error ?? "Route information is not available."}</p>}
      {option.route?.warnings?.map((warning, index) => <p key={index} className="mt-3 text-xs leading-5 text-[#8a4b00]">{warning}</p>)}
    </section>
  );
}
