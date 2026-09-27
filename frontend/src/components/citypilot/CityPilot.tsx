"use client";

import { useEffect, useRef, useState } from "react";
import { CityPilotMap } from "@/components/citypilot/CityPilotMap";
import { RouteComparison } from "@/components/citypilot/RouteComparison";
import { TripBreakdown } from "@/components/citypilot/TripBreakdown";
import { TripPlanner } from "@/components/citypilot/TripPlanner";
import { useUserLocation } from "@/hooks/useUserLocation";
import type { TripLocation } from "@/lib/location-suggestions";
import { compareRoutes, getRouteRecommendation } from "@/lib/route-options";
import { routeErrorMessage, type RouteMode, type RouteOption, type RouteRecommendation } from "@/lib/route-metrics";

type SidebarView = "planner" | "breakdown";

function routeLocation(location: TripLocation) {
  return location.latitude != null && location.longitude != null
    ? { lat: location.latitude, lng: location.longitude }
    : location.label.trim();
}

export function CityPilot({ initialDestination }: { initialDestination: string }) {
  const [origin, setOrigin] = useState<TripLocation>({ label: "" });
  const [destination, setDestination] = useState<TripLocation>({ label: initialDestination });
  const [arriveByDate, setArriveByDate] = useState("");
  const [arriveByTime, setArriveByTime] = useState("");
  const [travelMode, setTravelMode] = useState<RouteMode>("Transit");
  const [options, setOptions] = useState<RouteOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recommendation, setRecommendation] = useState<RouteRecommendation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [sidebarView, setSidebarView] = useState<SidebarView>("planner");
  const [sidebarExiting, setSidebarExiting] = useState(false);
  const [hasTransitioned, setHasTransitioned] = useState(false);
  const requestRef = useRef(0);
  const aiController = useRef<AbortController | null>(null);
  const transitionTimer = useRef<number | null>(null);
  const userLocation = useUserLocation();

  useEffect(() => {
    const target = new Date(Date.now() + 60 * 60 * 1000);
    const pad = (value: number) => String(value).padStart(2, "0");
    setArriveByDate(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`);
    setArriveByTime(`${pad(target.getHours())}:${pad(target.getMinutes())}`);
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
    requestRef.current += 1;
    aiController.current?.abort();
    setOptions([]);
    setRecommendation(null);
    setAiLoading(false);
    setAiError("");
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
      const available = results.filter((option) => option.metrics);
      if (!available.length) {
        setError("No route data is available for these locations and arrival time.");
        return;
      }
      const nextMode = available.some((option) => option.mode === travelMode) ? travelMode : available[0].mode;
      setTravelMode(nextMode);
      transitionSidebar("breakdown");
      setAiLoading(true);
      const controller = new AbortController();
      aiController.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 30000);
      try {
        const result = await getRouteRecommendation(available, controller.signal);
        if (request === requestRef.current) setRecommendation(result);
      } catch (cause) {
        if (request === requestRef.current) setAiError("AI comparison unavailable.");
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
                <TripBreakdown key={selected.mode} option={selected} origin={origin} destination={destination} onEdit={editTrip} />
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
        <p className="nextstop-footer mt-5 text-[10px] leading-4 text-[#767b80]">Routes and schedules are estimates from Google Maps. Ock compares the available data; missing fares, costs, and buffer times stay unknown. Route endpoints must be within the NYC map bounds.</p>
      </div>
    </div>
  );
}
