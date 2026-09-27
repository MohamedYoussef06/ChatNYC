import type { RouteMode } from "@/lib/route-metrics";
import { weatherPointView, weatherSummary, type RouteWeather } from "@/lib/weather";

const exposure: Record<RouteMode, string> = {
  Walk: "Mostly outdoors",
  Transit: "Some time outdoors",
  Drive: "Mostly inside a vehicle",
};

export function RouteWeatherSection({ mode, status, weather }: {
  mode: RouteMode;
  status: "loading" | "ready" | "unavailable";
  weather?: RouteWeather;
}) {
  const summary = status === "ready" ? weatherSummary(weather) : null;
  const points = status === "ready" && weather
    ? [
      weatherPointView("Leaving", weather.departure),
      weatherPointView("Arriving", weather.arrival),
      weatherPointView("Midpoint", weather.midpoint),
    ].filter((point) => point != null)
    : [];
  const ready = status === "ready" && points.length > 0;

  return (
    <section aria-labelledby="route-weather-heading" className="mt-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="route-weather-heading" className="text-sm font-semibold">Weather</h3>
        {summary && <p className="text-right text-xs font-semibold text-[#282d31]">{summary}</p>}
      </div>
      {status === "loading" && <p role="status" className="mt-3 text-xs leading-5 text-[#747b80]">Checking weather for this route…</p>}
      {status === "unavailable" && <p role="status" className="mt-3 text-xs leading-5 text-[#747b80]">Weather unavailable</p>}
      {status === "ready" && !ready && <p role="status" className="mt-3 text-xs leading-5 text-[#747b80]">Weather unavailable</p>}
      {ready && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
            {points.map((point) => (
              <div key={point.label} className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.11em] text-[#73797e]">{point.label}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-[#282d31]">{point.primary}</p>
                {point.details.map((detail) => <p key={detail} className="mt-1 text-xs leading-5 text-[#4f565b]">{detail}</p>)}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-4 text-[#747b80]">Outside: {exposure[mode]}</p>
        </>
      )}
    </section>
  );
}
