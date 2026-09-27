"use client";

import { useEffect, useRef, useState } from "react";
import { CityPilotMap } from "@/components/citypilot/CityPilotMap";
import { RouteComparison } from "@/components/citypilot/RouteComparison";
import { TripBreakdown } from "@/components/citypilot/TripBreakdown";
import { TripPlanner } from "@/components/citypilot/TripPlanner";
import { useUserLocation } from "@/hooks/useUserLocation";
import type { TripLocation } from "@/lib/location-suggestions";
import { getTransitAlerts, planTransitEnrichment } from "@/lib/api";
import { subwayLineLabels, type TransitAlert, type TransitEnrichment } from "@/lib/backend";
import { compareRoutes, getRouteRecommendation } from "@/lib/route-options";
import { getRouteWeather, type RouteWeather, type WeatherPlace } from "@/lib/weather";
import { isRouteOptionAvailable, routeErrorMessage, type RouteMode, type RouteOption, type RouteRecommendation } from "@/lib/route-metrics";
import { clearOckTripContext, storeOckTripContext } from "@/lib/ock-context";

type SidebarView = "planner" | "breakdown";
type WeatherStatus = "loading" | "ready" | "unavailable";
type MtaStatus = "loading" | "ready" | "unavailable";

function weatherPlace(location: TripLocation): WeatherPlace | undefined {
  if (location.latitude == null || location.longitude == null) return undefined;
  return location.label ? { latitude: location.latitude, longitude: location.longitude, label: location.label } : { latitude: location.latitude, longitude: location.longitude };
}

function routeLocation(location: TripLocation) {
  return location.latitude != null && location.longitude != null
    ? { lat: location.latitude, lng: location.longitude }
    : location.label.trim();
}

function splitArrive(value: string): { date: string; time: string } | null {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) return null;
  const pad = (part: number) => String(part).padStart(2, "0");
  return {
    date: `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`,
    time: `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`,
  };
}

export function CityPilot({
  initialOrigin = "",
  initialDestination = "",
  initialArriveBy = "",
  initialMode = "Transit",
}: {
  initialOrigin?: string;
  initialDestination?: string;
  initialArriveBy?: string;
  initialMode?: RouteMode;
}) {
  const handedArrive = splitArrive(initialArriveBy);
  const [origin, setOrigin] = useState<TripLocation>({ label: initialOrigin });
  const [destination, setDestination] = useState<TripLocation>({ label: initialDestination });
  const [arriveByDate, setArriveByDate] = useState(handedArrive?.date ?? "");
  const [arriveByTime, setArriveByTime] = useState(handedArrive?.time ?? "");
  const [travelMode, setTravelMode] = useState<RouteMode>(initialMode);
  const [options, setOptions] = useState<RouteOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recommendation, setRecommendation] = useState<RouteRecommendation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [weatherState, setWeatherState] = useState<{ mode: RouteMode; status: WeatherStatus; weather?: RouteWeather } | null>(null);
  const [mtaState, setMtaState] = useState<{ status: MtaStatus; alerts: TransitAlert[] } | null>(null);
  const [transitEnrichment, setTransitEnrichment] = useState<{ status: MtaStatus; segments: TransitEnrichment["subwaySegments"]; transfers: TransitEnrichment["transferSegments"] } | null>(null);
  const [sidebarView, setSidebarView] = useState<SidebarView>("planner");
  const [sidebarExiting, setSidebarExiting] = useState(false);
  const [hasTransitioned, setHasTransitioned] = useState(false);
  const requestRef = useRef(0);
  const weatherRequest = useRef(0);
  const mtaRequest = useRef(0);
  const aiController = useRef<AbortController | null>(null);
  const transitionTimer = useRef<number | null>(null);
  const userLocation = useUserLocation();

  useEffect(() => {
    if (!handedArrive) {
      const target = new Date(Date.now() + 60 * 60 * 1000);
      const pad = (value: number) => String(value).padStart(2, "0");
      setArriveByDate(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`);
      setArriveByTime(`${pad(target.getHours())}:${pad(target.getMinutes())}`);
    }
    return () => {
      requestRef.current += 1;
      aiController.current?.abort();
      if (transitionTimer.current != null) window.clearTimeout(transitionTimer.current);
    };
  }, []);

  function transitionSidebar(nextView: SidebarView) {
    if (transitionTimer.current != null) window.clearTimeout(transitionTimer.current);
    setSidebarExiting(true);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    transitionTimer.current = window.setTimeout(() => {
      setSidebarView(nextView);
      setSidebarExiting(false);
      setHasTransitioned(true);
      transitionTimer.current = null;
    }, reduceMotion ? 0 : 150);
  }

  function invalidate() {
    clearOckTripContext();
    requestRef.current += 1;
    weatherRequest.current += 1;
    mtaRequest.current += 1;
    aiController.current?.abort();
    setOptions([]);
    setRecommendation(null);
    setAiLoading(false);
    setAiError("");
    setWeatherState(null);
    setMtaState(null);
    setTransitEnrichment(null);
    setError("");
    setBusy(false);
  }

  async function planTrip() {
    if (!origin.label.trim()) {
      setError("Enter a starting location.");
      return;
    }
    if (!destination.label.trim()) {
      setError("Enter a destination.");
      return;
    }
    const deadline = new Date(`${arriveByDate}T${arriveByTime}:00`);
    if (!Number.isFinite(deadline.getTime()) || deadline.getTime() <= Date.now() || deadline.getTime() > Date.now() + 100 * 86400000) {
      setError("Choose an arrival time in the future, within the next 100 days.");
      return;
    }
    invalidate();
    const request = requestRef.current;
    setBusy(true);
    try {
      const results = await compareRoutes(routeLocation(origin), routeLocation(destination), deadline);
      if (request !== requestRef.current) return;
      setOptions(results);
      setBusy(false);
      const available = results.filter(isRouteOptionAvailable);
      if (!available.length) {
        setError("No route data is available for these locations and arrival time.");
        return;
      }
      const nextMode = available.some((option) => option.mode === travelMode) ? travelMode : available[0].mode;
      setTravelMode(nextMode);
      transitionSidebar("breakdown");
      if (available.length < 2) return;
      setAiLoading(true);
      const controller = new AbortController();
      aiController.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 30000);
      try {
        const result = await getRouteRecommendation(available, controller.signal);
        if (request === requestRef.current) setRecommendation(result);
      } catch (cause) {
        if (request === requestRef.current) setAiError(controller.signal.aborted
          ? "Grok took too long. You can still choose a route manually."
          : cause instanceof Error ? cause.message : "AI comparison unavailable. You can still choose a route manually.");
      } finally {
        window.clearTimeout(timeout);
        if (request === requestRef.current) setAiLoading(false);
      }
    } catch (cause) {
      if (request === requestRef.current) {
        setError(routeErrorMessage(cause));
        setBusy(false);
      }
    }
  }

  async function useCurrentLocation() {
    const location = userLocation.location ?? await userLocation.requestLocation();
    if (!location) return;
    invalidate();
    setOrigin({ label: "Current location", latitude: location.latitude, longitude: location.longitude });
  }

  function editTrip() {
    setError("");
    transitionSidebar("planner");
  }

  const selected = options.find((option) => option.mode === travelMode) ?? options[0];
  const showingResults = sidebarView === "breakdown" && Boolean(selected);
  const arriveByForSave = arriveByDate && arriveByTime ? new Date(`${arriveByDate}T${arriveByTime}:00`).toISOString() : undefined;
  useEffect(() => {
    if (!options.length) return;
    const active = options.find((option) => option.mode === travelMode) ?? options[0];
    storeOckTripContext({
      time: new Date().toISOString(),
      trip: { originLabel: origin.label, destinationLabel: destination.label, departure: active.departure?.toISOString(), arrival: active.arrival?.toISOString(), mode: active.mode },
      routes: options.filter((option) => option.metrics).map((option) => ({ mode: option.mode, departure: option.departure?.toISOString(), arrival: option.arrival?.toISOString(), durationMinutes: option.metrics?.durationMinutes, weather: option.weather })),
      ...(active.weather ? { weather: active.weather } : {}),
      ...(mtaState ? { transitStatus: { summary: mtaState.status === "ready" ? mtaState.alerts.map((alert) => `${alert.routes.join(", ")}: ${alert.header}`).join("; ") || "No relevant MTA alerts reported." : "MTA alert data unavailable." } } : {}),
    });
  }, [options, travelMode, origin, destination, mtaState]);
  const weatherQuery = showingResults && selected?.departure && selected.arrival ? {
    mode: selected.mode,
    departure: selected.departure,
    arrival: selected.arrival,
    origin,
    destination,
    cached: selected.weather,
  } : null;
  const weatherKey = weatherQuery
    ? `${weatherQuery.mode}|${weatherQuery.departure.getTime()}|${weatherQuery.arrival.getTime()}|${origin.latitude ?? ""}|${origin.longitude ?? ""}|${destination.latitude ?? ""}|${destination.longitude ?? ""}|${weatherQuery.cached ? "ready" : "open"}`
    : "";
  const weatherQueryRef = useRef(weatherQuery);
  weatherQueryRef.current = weatherQuery;

  useEffect(() => {
    const query = weatherQueryRef.current;
    if (!query) return;
    const request = ++weatherRequest.current;
    if (query.cached) {
      setWeatherState({ mode: query.mode, status: "ready", weather: query.cached });
      return;
    }
    let cancelled = false;
    setWeatherState({ mode: query.mode, status: "loading" });
    void getRouteWeather({
      origin: weatherPlace(query.origin),
      destination: weatherPlace(query.destination),
      departureTime: query.departure.toISOString(),
      arrivalTime: query.arrival.toISOString(),
    }).then((weather) => {
      if (cancelled || request !== weatherRequest.current) return;
      if (weather) setOptions((current) => current.map((option) => option.mode === query.mode ? { ...option, weather } : option));
      setWeatherState(weather ? { mode: query.mode, status: "ready", weather } : { mode: query.mode, status: "unavailable" });
    }).catch(() => {
      if (!cancelled && request === weatherRequest.current) setWeatherState({ mode: query.mode, status: "unavailable" });
    });
    return () => { cancelled = true; };
  }, [weatherKey]);

  const transitOption = options.find((option) => option.mode === "Transit");
  const subwayLines = subwayLineLabels(transitOption?.route?.legs?.flatMap((leg) => leg.steps) ?? []);
  const mtaKey = subwayLines.join("|");

  useEffect(() => {
    if (!showingResults || !transitOption || !subwayLines.length) {
      setTransitEnrichment(null);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setTransitEnrichment({ status: "loading", segments: [], transfers: [] });
    const arriveBy = new Date(`${arriveByDate}T${arriveByTime}:00`);
    const toPlace = (location: TripLocation) => location.latitude != null && location.longitude != null
      ? { label: location.label, lat: location.latitude, lon: location.longitude }
      : { query: location.label };
    void planTransitEnrichment({ origin: toPlace(origin), destination: toPlace(destination), arriveBy: arriveBy.toISOString() }, controller.signal).then((report) => {
      if (cancelled) return;
      const googleSteps = transitOption.route?.legs?.flatMap((leg) => leg.steps ?? []).filter((step) => step.transitDetails?.transitLine?.vehicle?.vehicleType === "SUBWAY") ?? [];
      const expected = googleSteps.map((step) => ({
        route: step.transitDetails?.transitLine?.shortName?.trim().toLowerCase() ?? undefined,
        from: step.transitDetails?.departureStop?.name ?? undefined,
        to: step.transitDetails?.arrivalStop?.name ?? undefined,
      }));
      const normalize = (value: string | undefined) => value?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
      const matches = Boolean(report?.fresh && report.subwaySegments.length === expected.length && expected.length > 0 && report.subwaySegments.every((segment, index) =>
        segment.route.toLowerCase() === expected[index].route && normalize(segment.from) === normalize(expected[index].from) && normalize(segment.to) === normalize(expected[index].to),
      ));
      setTransitEnrichment(matches ? { status: "ready", segments: report!.subwaySegments, transfers: report!.transferSegments } : { status: "unavailable", segments: [], transfers: [] });
    }).catch(() => {
      if (!cancelled) setTransitEnrichment({ status: "unavailable", segments: [], transfers: [] });
    });
    return () => { cancelled = true; controller.abort(); };
  }, [showingResults, mtaKey, travelMode, origin, destination, arriveByDate, arriveByTime]);

  useEffect(() => {
    if (!mtaKey) {
      setMtaState(null);
      return;
    }
    const request = ++mtaRequest.current;
    const controller = new AbortController();
    setMtaState({ status: "loading", alerts: [] });
    void getTransitAlerts(mtaKey.split("|"), controller.signal).then((report) => {
      if (request !== mtaRequest.current) return;
      setMtaState(report?.fresh ? { status: "ready", alerts: report.alerts } : { status: "unavailable", alerts: [] });
    }).catch(() => {
      if (controller.signal.aborted || request !== mtaRequest.current) return;
      setMtaState({ status: "unavailable", alerts: [] });
    });
    return () => controller.abort();
  }, [mtaKey]);

  return (
    <div className="nextstop-workspace relative left-1/2 -mt-12 w-screen max-w-none -translate-x-1/2 px-5 pb-12 sm:px-8 xl:px-12 2xl:px-16">
      <div className="mx-auto max-w-[1600px]">
        <header className="nextstop-header relative pb-6 pt-9">
          <p className="nextstop-page-eyebrow mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0039a6]">NextStop</p>
          <h1 className="nextstop-page-title text-[2.35rem] font-semibold leading-none tracking-[-0.055em] text-[#151719] sm:text-[2.8rem]">Find your best way there.</h1>
          <p className="nextstop-page-copy mt-3 text-sm text-[#5f6469]">Compare walking, driving, and transit. Let Ock weigh the tradeoffs.</p>
        </header>
        <section aria-label="NextStop trip workspace" className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] lg:gap-6">
          {showingResults && (
            <div className="order-1 min-w-0 lg:col-start-2 lg:row-start-1">
              <RouteComparison options={options} selected={travelMode} onSelect={setTravelMode} recommendation={recommendation} aiLoading={aiLoading} aiError={aiError} />
            </div>
          )}
          <div className={`${showingResults ? "order-2" : "order-1"} nextstop-planner-column min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1`}>
            <div className={`nextstop-sidebar-slot${sidebarExiting ? " is-exiting" : ""}`}>
              {showingResults && selected ? (
                <TripBreakdown key={selected.mode} option={selected} origin={origin} destination={destination} arriveBy={arriveByForSave} onEdit={editTrip}
                  weatherStatus={weatherState?.mode === selected.mode ? weatherState.status : "loading"}
                  weather={weatherState?.mode === selected.mode ? weatherState.weather : undefined}
                  mtaStatus={selected.mode === "Transit" ? mtaState?.status : undefined}
                  mtaAlerts={selected.mode === "Transit" ? mtaState?.alerts : undefined}
                  transitSegments={selected.mode === "Transit" ? transitEnrichment?.segments : undefined}
                  transitTransferSegments={selected.mode === "Transit" ? transitEnrichment?.transfers : undefined}
                  transitEnrichmentStatus={selected.mode === "Transit" ? transitEnrichment?.status : undefined} />
              ) : (
                <TripPlanner origin={origin} destination={destination} arriveByDate={arriveByDate} arriveByTime={arriveByTime} busy={busy}
                  locationStatus={userLocation.status} locationError={userLocation.error} usingCurrentLocation={origin.label === "Current location" && origin.latitude != null}
                  returning={hasTransitioned}
                  onOriginChange={(value) => { invalidate(); setOrigin({ label: value }); }}
                  onOriginSelect={setOrigin}
                  onDestinationChange={(value) => { invalidate(); setDestination({ label: value }); }}
                  onDestinationSelect={setDestination}
                  onArriveByDateChange={(value) => { invalidate(); setArriveByDate(value); }}
                  onArriveByTimeChange={(value) => { invalidate(); setArriveByTime(value); }}
                  onUseCurrentLocation={() => void useCurrentLocation()} onPlan={() => void planTrip()} />
              )}
            </div>
            {error && <p role="alert" className="nextstop-result-enter mt-3 rounded-xl bg-[#fff1ee] p-4 text-sm text-[#b3261e]">{error}</p>}
          </div>
          <div className={`${showingResults ? "order-3 lg:row-start-2" : "order-2 lg:row-start-1"} nextstop-map-column min-w-0 lg:col-start-2`}>
            <CityPilotMap route={showingResults ? selected?.route : undefined} userLocation={userLocation.location} />
          </div>
        </section>
        <p className="nextstop-footer mt-5 text-[10px] leading-4 text-[#767b80]">Routes and schedules are estimates from Google Maps. Ock compares the available data; missing fares, costs, buffer times, and weather stay unknown. Route endpoints must be within the NYC map bounds.</p>
      </div>
    </div>
  );
}
