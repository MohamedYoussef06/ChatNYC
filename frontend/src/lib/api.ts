import { parseBackendPlaceHit, parseSavedTripCard, parseStationMatch, parseSubwayItinerary, parseTransitAlert, parseTransitAlertReport, type BackendPlaceHit, type SavedTripCard, type SharedMeeting, type StationMatch, type SubwayItinerary, type TransitAlert, type TransitAlertReport, type TransitEnrichment } from "./backend";
import type { Place, Trip, UserProfile } from "./types";

export function apiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl()}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${path}`);
  }
  return response.json() as Promise<T>;
}

export function getPlaces(): Promise<Place[]> {
  return getJson<Place[]>("/api/discover");
}

export function getTrips(): Promise<Trip[]> {
  return getJson<Trip[]>("/api/trips");
}

export function getProfile(): Promise<UserProfile> {
  return getJson<UserProfile>("/api/users/me");
}

async function readJson(path: string, init?: RequestInit): Promise<unknown | null> {
  const response = await fetch(`${apiUrl()}${path}`, { cache: "no-store", ...init });
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

export async function getTransitAlerts(routes: string[], signal?: AbortSignal): Promise<TransitAlertReport | null> {
  const labels = routes.map((route) => route.trim()).filter(Boolean).slice(0, 12);
  if (!labels.length) return null;
  return parseTransitAlertReport(await readJson(`/api/transit/alerts?${new URLSearchParams({ routes: labels.join(",") })}`, { signal }));
}

export async function planTransitEnrichment(body: { origin: { label?: string; query?: string; lat?: number; lon?: number }; destination: { label?: string; query?: string; lat?: number; lon?: number }; arriveBy: string }, signal?: AbortSignal): Promise<TransitEnrichment | null> {
  const payload = await readJson("/api/transit/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ origin: body.origin, destination: body.destination, arrive_by: body.arriveBy }),
  });
  if (!payload || typeof payload !== "object") return null;
  const mta = (payload as Record<string, unknown>).mta_enrichment;
  if (!mta || typeof mta !== "object") return null;
  const data = mta as Record<string, unknown>;
  if (typeof data.fresh !== "boolean" || !Array.isArray(data.subway_segments)) return null;
  const subwaySegments = data.subway_segments.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    if (![row.route, row.from, row.to, row.departure, row.arrival].every((item) => typeof item === "string") || typeof row.live !== "boolean") return [];
    return [{ route: row.route as string, from: row.from as string, to: row.to as string, departure: row.departure as string, arrival: row.arrival as string, live: row.live, ...(typeof row.headsign === "string" && row.headsign ? { headsign: row.headsign } : {}) }];
  });
  const transferSegments = Array.isArray(data.transfer_segments) ? data.transfer_segments.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    if (![row.from, row.to, row.departure, row.arrival].every((item) => typeof item === "string")) return [];
    return [{ from: row.from as string, to: row.to as string, departure: row.departure as string, arrival: row.arrival as string }];
  }) : [];
  const alerts = Array.isArray(data.alerts) ? data.alerts.flatMap((value) => { const alert = parseTransitAlert(value); return alert ? [alert] : []; }) : [];
  return { fresh: data.fresh, updatedAt: text(data.updated_at), subwaySegments, transfers: typeof data.transfers === "number" ? data.transfers : 0, transferSegments, alerts };
}

function text(value: unknown): string | null { return typeof value === "string" && value.trim() ? value.trim() : null; }

export async function searchStations(query: string, signal?: AbortSignal): Promise<StationMatch[] | null> {
  const payload = await readJson(`/api/stations?${new URLSearchParams({ q: query })}`, { signal });
  if (!Array.isArray(payload)) return null;
  return payload.flatMap((row) => { const station = parseStationMatch(row); return station ? [station] : []; });
}

export async function searchBackendPlaces(query: string, signal?: AbortSignal): Promise<BackendPlaceHit[] | null> {
  const payload = await readJson(`/api/places?${new URLSearchParams({ q: query })}`, { signal });
  if (!Array.isArray(payload)) return null;
  return payload.flatMap((row) => { const place = parseBackendPlaceHit(row); return place ? [place] : []; });
}

export async function listSavedTrips(signal?: AbortSignal): Promise<SavedTripCard[] | null> {
  const payload = await readJson("/api/trips", { signal });
  if (!Array.isArray(payload)) return null;
  return payload.flatMap((row) => { const card = parseSavedTripCard(row); return card ? [card] : []; });
}

export async function getSavedTrip(id: string, signal?: AbortSignal): Promise<SubwayItinerary | null> {
  return parseSubwayItinerary(await readJson(`/api/trips/${encodeURIComponent(id)}`, { signal }));
}

// POST /api/trips plans a subway trip and saves it. Compare Routes does not call this.
export async function planSubwayTrip(body: { origin: { label?: string; query?: string; lat?: number; lon?: number }; destination: { label?: string; query?: string; lat?: number; lon?: number }; departAt?: string; arriveBy?: string }, signal?: AbortSignal): Promise<SubwayItinerary | null> {
  return parseSubwayItinerary(await readJson("/api/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ origin: body.origin, destination: body.destination, depart_at: body.departAt ?? null, arrive_by: body.arriveBy ?? null }),
  }));
}

export async function createSharedMeeting(tripId: string, placeName: string, arriveBy?: string, signal?: AbortSignal): Promise<SharedMeeting | null> {
  const payload = await readJson("/api/meetings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ trip_id: tripId, place_name: placeName, arrive_by: arriveBy ?? null }),
  });
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.share_code !== "string" || typeof record.url_path !== "string" || typeof record.share_url !== "string") return null;
  return { shareCode: record.share_code, urlPath: record.url_path, shareUrl: record.share_url };
}

export async function getSharedMeeting(shareCode: string, signal?: AbortSignal): Promise<{ shareCode: string; placeName: string; itinerary: SubwayItinerary; alerts: TransitAlert[] } | null> {
  const payload = await readJson(`/api/meetings/${encodeURIComponent(shareCode)}`, { signal });
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const itinerary = parseSubwayItinerary(record.itinerary);
  if (typeof record.share_code !== "string" || typeof record.place_name !== "string" || !itinerary) return null;
  const alerts = Array.isArray(record.alerts) ? record.alerts.flatMap((alert) => { const parsed = parseTransitAlert(alert); return parsed ? [parsed] : []; }) : [];
  return { shareCode: record.share_code, placeName: record.place_name, itinerary, alerts };
}
