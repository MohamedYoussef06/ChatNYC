export type TransitAlert = { header: string; routes: string[] };
export type TransitAlertReport = { fresh: boolean; updatedAt: string | null; alerts: TransitAlert[] };
export type TransitEnrichment = {
  fresh: boolean;
  updatedAt: string | null;
  subwaySegments: Array<{ route: string; from: string; to: string; departure: string; arrival: string; live: boolean; headsign?: string }>;
  transfers: number;
  transferSegments: Array<{ from: string; to: string; departure: string; arrival: string }>;
  alerts: TransitAlert[];
};
export type StationMatch = { id: string; name: string; lat: number; lon: number; routes: string[] };
export type BackendPlaceHit = { type: "station" | "address"; id?: string; name: string; lat: number; lon: number; routes: string[] };
export type SavedTripCard = {
  id: string;
  title: string | null;
  origin: string;
  destination: string;
  summary: string | null;
  leaveAt: string | null;
  arriveAt: string | null;
  durationSeconds: number | null;
  live: boolean;
  createdAt: string;
};
export type SubwayLeg = {
  type: "walk" | "subway" | "transfer";
  route: string | null;
  fromLabel: string;
  toLabel: string;
  departure: string;
  arrival: string;
  live: boolean;
};
export type SubwayItinerary = {
  id: string;
  originLabel: string;
  destinationLabel: string;
  durationSeconds: number;
  live: boolean;
  routes: string[];
  alerts: TransitAlert[];
  leaveAt: string | null;
  arriveAt: string | null;
  legs: SubwayLeg[];
};
export type SharedMeeting = { shareCode: string; urlPath: string; shareUrl: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseTransitAlert(value: unknown): TransitAlert | null {
  if (!isRecord(value)) return null;
  const header = text(value.header);
  if (!header || !Array.isArray(value.routes) || !value.routes.every((route) => typeof route === "string" && route.trim())) return null;
  return { header, routes: value.routes.map((route) => route.trim()) };
}

export function parseTransitAlertReport(value: unknown): TransitAlertReport | null {
  if (!isRecord(value) || typeof value.fresh !== "boolean") return null;
  if (!Array.isArray(value.alerts)) return null;
  const updatedAt = value.updated_at == null ? null : text(value.updated_at);
  if (value.updated_at != null && updatedAt == null) return null;
  return { fresh: value.fresh, updatedAt, alerts: value.alerts.flatMap((alert) => { const parsed = parseTransitAlert(alert); return parsed ? [parsed] : []; }) };
}

export function subwayLineLabels(steps: readonly unknown[]): string[] {
  const labels: string[] = [];
  for (const step of steps) {
    if (!isRecord(step) || !isRecord(step.transitDetails) || !isRecord(step.transitDetails.transitLine)) continue;
    const line = step.transitDetails.transitLine;
    const vehicle = isRecord(line.vehicle) ? line.vehicle : null;
    const name = text(line.shortName);
    if (vehicle?.vehicleType !== "SUBWAY" || !name || labels.includes(name)) continue;
    labels.push(name);
    if (labels.length === 12) break;
  }
  return labels;
}

export function parseStationMatch(value: unknown): StationMatch | null {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  const name = text(value.name);
  const lat = finite(value.lat);
  const lon = finite(value.lon);
  if (!id || !name || lat == null || lon == null || !Array.isArray(value.routes)) return null;
  const routes = value.routes.filter((route): route is string => typeof route === "string" && Boolean(route.trim())).map((route) => route.trim());
  return { id, name, lat, lon, routes };
}

export function parseBackendPlaceHit(value: unknown): BackendPlaceHit | null {
  if (!isRecord(value) || (value.type !== "station" && value.type !== "address")) return null;
  const name = text(value.name);
  const lat = finite(value.lat);
  const lon = finite(value.lon);
  if (!name || lat == null || lon == null) return null;
  const id = text(value.id) ?? undefined;
  const routes = Array.isArray(value.routes) ? value.routes.filter((route): route is string => typeof route === "string" && Boolean(route.trim())).map((route) => route.trim()) : [];
  return { type: value.type, id, name, lat, lon, routes };
}

export function parseSavedTripCard(value: unknown): SavedTripCard | null {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  const origin = text(value.origin);
  const destination = text(value.destination);
  const createdAt = text(value.created_at);
  if (!id || !origin || !destination || !createdAt || typeof value.live !== "boolean") return null;
  const durationSeconds = value.duration_seconds == null ? null : finite(value.duration_seconds);
  if (value.duration_seconds != null && durationSeconds == null) return null;
  return {
    id, origin, destination, live: value.live, createdAt, durationSeconds,
    title: text(value.title), summary: text(value.summary), leaveAt: text(value.leave_at), arriveAt: text(value.arrive_at),
  };
}

function parseLeg(value: unknown): SubwayLeg | null {
  if (!isRecord(value) || (value.type !== "walk" && value.type !== "subway" && value.type !== "transfer")) return null;
  if (!isRecord(value.from) || !isRecord(value.to)) return null;
  const fromLabel = text(value.from.label);
  const toLabel = text(value.to.label);
  const departure = text(value.departure);
  const arrival = text(value.arrival);
  if (!fromLabel || !toLabel || !departure || !arrival || typeof value.live !== "boolean") return null;
  const route = value.route == null ? null : text(value.route);
  if (value.route != null && route == null) return null;
  return { type: value.type, route, fromLabel, toLabel, departure, arrival, live: value.live };
}

export function parseSubwayItinerary(value: unknown): SubwayItinerary | null {
  if (!isRecord(value) || !isRecord(value.origin) || !isRecord(value.destination)) return null;
  const id = text(value.id);
  const originLabel = text(value.origin.label);
  const destinationLabel = text(value.destination.label);
  const durationSeconds = finite(value.duration_seconds);
  if (!id || !originLabel || !destinationLabel || durationSeconds == null || typeof value.live !== "boolean" || !Array.isArray(value.legs)) return null;
  const legs = value.legs.map(parseLeg);
  if (legs.some((leg) => leg == null)) return null;
  const routes = Array.isArray(value.routes) ? value.routes.filter((route): route is string => typeof route === "string" && Boolean(route.trim())).map((route) => route.trim()) : [];
  const alerts = Array.isArray(value.alerts) ? value.alerts.flatMap((alert) => { const parsed = parseTransitAlert(alert); return parsed ? [parsed] : []; }) : [];
  return {
    id, originLabel, destinationLabel, durationSeconds, live: value.live, routes, alerts, legs: legs as SubwayLeg[],
    leaveAt: text(value.leave_at), arriveAt: text(value.arrive_at),
  };
}
