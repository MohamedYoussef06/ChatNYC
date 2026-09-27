import { loadGoogleMapsLibrary } from "@/lib/google-maps";
import { NYC_BOUNDS, type Coordinates } from "@/lib/location-suggestions";
import { routeErrorMessage, summarizeRoute, type RouteMode, type RouteOption, type RouteRecommendation } from "@/lib/route-metrics";

const MODES = { Walk: "WALKING", Drive: "DRIVING", Transit: "TRANSIT" } as const;

export async function compareRoutes(origin: string | Coordinates, destination: string | Coordinates, deadline: Date, drivingCost: number | null): Promise<RouteOption[]> {
  const { Route } = await loadGoogleMapsLibrary("routes");
  const now = new Date();
  return Promise.all((Object.keys(MODES) as RouteMode[]).map(async (mode) => {
    try {
      const request: google.maps.routes.ComputeRoutesRequest = {
        origin, destination, travelMode: MODES[mode], language: "en-US", region: "us",
        fields: ["durationMillis", "distanceMeters", "path", "viewport", "legs", "travelAdvisory", "warnings"],
        ...(mode === "Transit" ? { arrivalTime: deadline } : mode === "Drive" ? { departureTime: now, routingPreference: "TRAFFIC_AWARE" } : {}),
      };
      let result = await Route.computeRoutes(request);
      let route = result.routes?.[0];
      // Refine driving traffic for the estimated departure, rather than assuming
      // present traffic will apply to a later trip. Google has no driving arrive-by option.
      if (mode === "Drive" && route?.durationMillis) {
        const departure = new Date(deadline.getTime() - route.durationMillis);
        if (departure.getTime() > now.getTime() + 60000) {
          result = await Route.computeRoutes({ ...request, departureTime: departure });
          route = result.routes?.[0];
        }
      }
      if (!route) return { mode, error: "Google found no route for this mode at the selected time." };
      const endpoints = [route.legs?.[0]?.startLocation, route.legs?.at(-1)?.endLocation];
      if (endpoints.some((point) => point && (point.lat < NYC_BOUNDS.south || point.lat > NYC_BOUNDS.north || point.lng < NYC_BOUNDS.west || point.lng > NYC_BOUNDS.east))) {
        throw new Error("Route endpoints outside NYC bounds");
      }
      return summarizeRoute(route, mode, deadline, now, drivingCost);
    } catch (error) { return { mode, error: routeErrorMessage(error) }; }
  }));
}

export async function getRouteRecommendation(options: RouteOption[], signal: AbortSignal): Promise<RouteRecommendation> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/trips/recommend`, {
    method: "POST", headers: { "Content-Type": "application/json" }, signal,
    body: JSON.stringify({ options: options.flatMap((option) => option.metrics ? [option.metrics] : []) }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(typeof data?.detail === "string" ? data.detail : "Grok could not compare these routes. You can still choose manually.");
  }
  const data = await response.json();
  if (!options.some((option) => option.metrics && option.mode === data.mode) || typeof data.reason !== "string" || !Array.isArray(data.tradeoffs) || !data.tradeoffs.every((item: unknown) => typeof item === "string")) {
    throw new Error("Grok returned an invalid recommendation. Choose a route manually.");
  }
  return data;
}
