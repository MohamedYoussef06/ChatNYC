export type RouteMode = "Walk" | "Drive" | "Transit";
export type RouteCostItem = {
  label: string;
  amount: number | null;
  currency: string | null;
};
export type RouteCost = {
  items: RouteCostItem[];
  total: number | null;
  currency: string | null;
  note: string;
};
export type RouteMetrics = {
  mode: RouteMode;
  durationMinutes: number;
  distanceMeters: number;
  cost: number | null;
  currency: string | null;
  costNote: string;
  walkingMinutes: number | null;
  transfers: number;
  transferWaitMinutes: number | null;
  serviceHeadwayMinutes: number | null;
  canArriveOnTime: boolean;
  costDetails: RouteCost;
};
export type RouteOption = {
  mode: RouteMode;
  metrics?: RouteMetrics;
  route?: google.maps.routes.Route;
  departure?: Date;
  arrival?: Date;
  error?: string;
  bufferMinutes?: number;
};
export type RouteRecommendation = { mode: RouteMode; reason: string; tradeoffs: string[] };

export function unavailableRouteCost(mode: RouteMode): RouteCost {
  if (mode === "Walk") {
    return {
      items: [{ label: "Transportation charge", amount: 0, currency: "USD" }],
      total: 0,
      currency: "USD",
      note: "No transportation charge",
    };
  }
  if (mode === "Drive") {
    return {
      items: ["Tolls", "Estimated fuel", "Parking", "Other route fees"].map((label) => ({ label, amount: null, currency: null })),
      total: null,
      currency: null,
      note: "Driving cost information unavailable",
    };
  }
  return {
    items: [{ label: "Fare", amount: null, currency: null }],
    total: null,
    currency: null,
    note: "Fare information unavailable",
  };
}

export function summarizeRoute(route: google.maps.routes.Route, mode: RouteMode, deadline: Date, now: Date, drivingCost: number | null): RouteOption {
  if (!route.durationMillis || !Number.isFinite(route.durationMillis) || route.distanceMeters == null) {
    throw new Error("Google did not return a complete route estimate.");
  }
  const steps = route.legs?.flatMap((leg) => leg.steps) ?? [];
  const rides = steps.filter((step) => step.travelMode === "TRANSIT");
  const walks = steps.filter((step) => step.travelMode === "WALKING");
  const walkingMillis = walks.reduce((sum, step) => sum + (step.staticDurationMillis ?? 0), 0);
  const completeWalkTimes = walks.every((step) => step.staticDurationMillis != null);
  let departure = new Date(deadline.getTime() - route.durationMillis);
  let arrival = new Date(deadline);
  let transferWaitMinutes: number | null = 0;
  let previousArrival: number | null = null;
  let walkingSinceRide = 0;
  let walkingBeforeFirst = 0;
  let seenRide = false;
  for (const step of steps) {
    if (step.travelMode !== "TRANSIT") {
      if (!seenRide) walkingBeforeFirst += step.staticDurationMillis ?? 0;
      else walkingSinceRide += step.staticDurationMillis ?? 0;
      continue;
    }
    const transit = step.transitDetails;
    const boardTime = transit?.departureTime?.getTime();
    if (!seenRide && boardTime != null) departure = new Date(boardTime - walkingBeforeFirst);
    if (seenRide) {
      if (previousArrival == null || boardTime == null || !completeWalkTimes) transferWaitMinutes = null;
      else if (transferWaitMinutes != null) transferWaitMinutes += Math.max(0, boardTime - previousArrival - walkingSinceRide) / 60000;
    }
    previousArrival = transit?.arrivalTime?.getTime() ?? null;
    walkingSinceRide = 0;
    seenRide = true;
  }
  if (mode === "Transit" && previousArrival != null) arrival = new Date(previousArrival + walkingSinceRide);
  const headways = rides.map((step) => step.transitDetails?.headwayMillis).filter((time): time is number => time != null && Number.isFinite(time));
  const fare = route.travelAdvisory?.transitFare;
  const cost = mode === "Walk" ? 0 : mode === "Drive" ? drivingCost : fare ? fare.units + fare.nanos / 1e9 : null;
  const currency = cost == null ? null : mode === "Transit" ? fare?.currencyCode ?? null : "USD";
  const unavailableCost = unavailableRouteCost(mode);
  const costDetails: RouteCost = cost == null ? unavailableCost : {
    items: [{ label: mode === "Transit" ? "Fare" : mode === "Drive" ? "Provided route cost" : "Transportation charge", amount: cost, currency }],
    total: cost,
    currency,
    note: mode === "Transit" ? "Google fare estimate" : mode === "Drive" ? "Provided route cost" : "No transportation charge",
  };
  return {
    mode, route, departure, arrival,
    metrics: {
      mode, durationMinutes: route.durationMillis / 60000, distanceMeters: route.distanceMeters,
      cost, currency,
      costNote: mode === "Walk" ? "No fare" : mode === "Drive" ? drivingCost == null ? "Fuel, tolls and parking not priced" : "Your estimate including fuel, tolls and parking" : fare ? "Google fare estimate" : "Fare not supplied by Google",
      walkingMinutes: mode === "Walk" ? route.durationMillis / 60000 : mode === "Drive" ? null : completeWalkTimes ? walkingMillis / 60000 : null,
      transfers: Math.max(0, rides.length - 1), transferWaitMinutes,
      serviceHeadwayMinutes: headways.length ? Math.max(...headways) / 60000 : null,
      canArriveOnTime: departure.getTime() >= now.getTime() && arrival.getTime() <= deadline.getTime(), costDetails,
    },
  };
}

export function routeErrorMessage(error: unknown) {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  if (/disabled|not been used|not authorized|permission|denied|API_KEY_SERVICE_BLOCKED/i.test(message)) {
    return "Google routing access is unavailable. Enable Routes API and allow it on your Maps key.";
  }
  if (/outside NYC/i.test(message)) return "Choose a starting point and destination within the NYC map bounds.";
  return "No route estimate is available for this mode. Try a different location or time.";
}
