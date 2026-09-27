import { loadGoogleMapsLibrary } from "@/lib/google-maps";
import { NYC_BOUNDS, type Coordinates } from "@/lib/location-suggestions";
import { routeErrorMessage, summarizeRoute, type RouteMetrics, type RouteMode, type RouteOption, type RouteRecommendation } from "@/lib/route-metrics";

const MODES = { Walk: "WALKING", Drive: "DRIVING", Transit: "TRANSIT" } as const;

export async function compareRoutes(origin: string | Coordinates, destination: string | Coordinates, deadline: Date): Promise<RouteOption[]> {
  const { Route } = await loadGoogleMapsLibrary("routes");
  const now = new Date();
  const driveDeparture = new Date(now.getTime() + 60_000);
  return Promise.all((Object.keys(MODES) as RouteMode[]).map(async (mode) => {
    try {
      const request: google.maps.routes.ComputeRoutesRequest = {
        origin, destination, travelMode: MODES[mode], language: "en-US", region: "us",
        fields: ["durationMillis", "distanceMeters", "path", "viewport", "legs", "travelAdvisory", "warnings"],
<<<<<<< HEAD
        ...(mode === "Transit" ? { arrivalTime: deadline } : mode === "Drive" ? { departureTime: driveDeparture, routingPreference: "TRAFFIC_AWARE" } : {}),
=======
        // Let Google use its server time for driving. A client timestamp of
        // "now" can already be in the past when Google receives the request.
        ...(mode === "Transit" ? { arrivalTime: deadline } : mode === "Drive" ? { routingPreference: "TRAFFIC_AWARE" } : {}),
>>>>>>> f481d80 (fixed NextStop)
      };
      const result = await Route.computeRoutes(request);
      let route = result.routes?.[0];
      // Refine driving traffic for the estimated departure, rather than assuming
      // present traffic will apply to a later trip. Google has no driving arrive-by option.
      if (mode === "Drive" && route?.durationMillis) {
        const departure = new Date(deadline.getTime() - route.durationMillis);
        if (departure.getTime() > Date.now() + 120_000) {
          try {
            const refined = await Route.computeRoutes({ ...request, departureTime: departure });
            route = refined.routes?.[0] ?? route;
          } catch {
            // Keep the current-traffic estimate if future traffic is unavailable.
          }
        }
      }
      if (!route) return { mode, error: "Google found no route for this mode at the selected time." };
      const endpoints = [route.legs?.[0]?.startLocation, route.legs?.at(-1)?.endLocation];
      if (endpoints.some((point) => point && (point.lat < NYC_BOUNDS.south || point.lat > NYC_BOUNDS.north || point.lng < NYC_BOUNDS.west || point.lng > NYC_BOUNDS.east))) {
        throw new Error("Route endpoints outside NYC bounds");
      }
      return summarizeRoute(route, mode, deadline, now, null);
    } catch (error) { return { mode, error: routeErrorMessage(error) }; }
  }));
}

function metricsForRecommendation(metrics: RouteMetrics) {
  const { costDetails, ...summary } = metrics;
  void costDetails;
  return summary;
}

export async function getRouteRecommendation(options: RouteOption[], signal: AbortSignal): Promise<RouteRecommendation> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/trips/recommend`, {
    method: "POST", headers: { "Content-Type": "application/json" }, signal,
    body: JSON.stringify({ options: options.flatMap((option) => option.metrics ? [metricsForRecommendation(option.metrics)] : []) }),
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
