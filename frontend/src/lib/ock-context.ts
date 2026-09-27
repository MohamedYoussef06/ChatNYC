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
