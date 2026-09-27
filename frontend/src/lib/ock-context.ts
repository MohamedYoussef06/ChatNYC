import type { RouteMode } from "@/lib/route-metrics";
import type { RouteWeather, WeatherPlace } from "@/lib/weather";

export type OckRouteContext = {
  mode: RouteMode;
  departure?: string;
  arrival?: string;
  durationMinutes?: number;
  weather?: RouteWeather;
};

export type OckTripContext = {
  location?: WeatherPlace;
  time?: string;
  weather?: RouteWeather;
  trip?: {
    originLabel?: string;
    destinationLabel?: string;
    departure?: string;
    arrival?: string;
    mode?: RouteMode;
  };
  routes?: OckRouteContext[];
  transitStatus?: { summary: string };
};

const ACTIVE_TRIP_KEY = "chatnyc:ock-active-trip";

export function storeOckTripContext(context: OckTripContext): void {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(context)); } catch { /* Context remains optional when storage is unavailable. */ }
}

export function clearOckTripContext(): void {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(ACTIVE_TRIP_KEY); } catch { /* Context remains optional when storage is unavailable. */ }
}

export function readOckTripContext(): OckTripContext | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_TRIP_KEY);
    if (!raw || raw.length > 12000) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as OckTripContext : undefined;
  } catch { return undefined; }
}
