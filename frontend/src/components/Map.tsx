import type { TravelMode, TravelOption } from "@/lib/types";

const MODE_LABEL: Record<TravelMode, string> = {
  walking: "Walking",
  driving: "Driving",
  transit: "Transit",
};

function formatCost(cost: number): string {
  if (cost <= 0) return "Free";
  return `$${cost.toFixed(2)}`;
}

export function Map({
  origin,
  destination,
  options,
  recommendedMode,
}: {
  origin: string;
  destination: string;
  options: TravelOption[];
  recommendedMode?: TravelMode | null;
}) {
  const active = recommendedMode
    ? options.find((o) => o.mode === recommendedMode) ?? options[0]
    : options[0];

  return (
    <div className="map" aria-label={`Route from ${origin} to ${destination}`}>
      <div className="map-endpoints">
        <span>{origin}</span>
        <span className="map-line" aria-hidden="true" />
        <span>{destination}</span>
      </div>
      {options.length > 0 ? (
        <ul className="mode-list" aria-label="Travel modes">
          {options.map((option) => {
            const isRecommended = option.mode === recommendedMode;
            return (
              <li
                key={option.mode}
                className={isRecommended ? "mode-option recommended" : "mode-option"}
              >
                <div className="mode-header">
                  <strong>{MODE_LABEL[option.mode]}</strong>
                  {isRecommended ? <span className="badge">Recommended</span> : null}
                </div>
                <p className="mode-meta">
                  {option.duration_minutes} min · {formatCost(option.cost_usd)} · ease{" "}
                  {option.ease_score}/10
                </p>
                <p className="mode-meta muted">
                  {option.transfers} transfer{option.transfers === 1 ? "" : "s"}
                  {option.wait_minutes > 0 ? ` · ~${option.wait_minutes} min wait` : ""}
                  {option.source === "estimate" ? " · estimate" : ""}
                </p>
                <p>{option.summary}</p>
              </li>
            );
          })}
        </ul>
      ) : null}
      {active ? (
        <p className="map-active muted" aria-live="polite">
          Showing {MODE_LABEL[active.mode]} corridor ({active.duration_minutes} min).
        </p>
      ) : null}
    </div>
  );
}
