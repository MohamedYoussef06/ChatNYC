import type { ItineraryStop, OckResultData } from "@/lib/ockMock";
import type { TripLocation } from "@/lib/location-suggestions";
import { routeStepLabel, type RouteOption } from "@/lib/route-metrics";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type SavedTripPlan = { id: string; title?: string };

type Itinerary = Extract<OckResultData, { type: "itinerary" }>;

export function itineraryToPlan(itinerary: Itinerary) {
  const stops = itinerary.stops;
  return {
    title: itinerary.title,
    origin: stops[0]?.name ?? itinerary.area,
    destination: stops.at(-1)?.name ?? itinerary.area,
    summary: `${itinerary.area} · ${itinerary.timeLabel}`,
    source: "ock" as const,
    area: itinerary.area,
    time_label: itinerary.timeLabel,
    total: itinerary.total,
    budget: itinerary.budget,
    stops: stops.map((stop: ItineraryStop) => ({
      time: stop.time,
      category: stop.category,
      name: stop.name,
      neighborhood: stop.neighborhood,
      note: stop.note,
      price: stop.price,
    })),
  };
}

export function citypilotToPlan(origin: TripLocation, destination: TripLocation, option: RouteOption) {
  const steps = option.route?.legs?.flatMap((leg) => leg.steps ?? []).map((step) => ({ text: routeStepLabel(step) })) ?? [];
  return {
    title: `${origin.label || "Origin"} to ${destination.label || "Destination"}`,
    origin: origin.label || "Origin",
    destination: destination.label || "Destination",
    summary: option.metrics ? `${option.mode} · ${Math.ceil(option.metrics.durationMinutes)} min` : option.mode,
    source: "citypilot" as const,
    mode: option.mode,
    leave_at: option.departure?.toISOString(),
    arrive_at: option.arrival?.toISOString(),
    duration_seconds: option.metrics ? Math.round(option.metrics.durationMinutes * 60) : undefined,
    steps,
  };
}

export async function saveTripPlan(plan: Record<string, unknown>): Promise<SavedTripPlan> {
  const response = await fetch(`${API}/api/trips/plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plan),
  });
  return readJson(response, "Could not save this plan.");
}

export async function sendTripPlan(tripId: string, phone: string): Promise<{ status: string; from_number?: string }> {
  const response = await fetch(`${API}/api/trips/${tripId}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  return readJson(response, "Could not text this plan.");
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof data?.detail === "string" ? data.detail : fallback);
  }
  return data as T;
}
