"use client";

import { useEffect, useRef, useState } from "react";
import { CityPilotMap } from "@/components/citypilot/CityPilotMap";
import { RouteComparison, RouteDetails } from "@/components/citypilot/RouteComparison";
import { TripPlanner, type TravelMode } from "@/components/citypilot/TripPlanner";
import { COLUMBIA_LOCATION, type Coordinates } from "@/lib/location-suggestions";
import { compareRoutes, getRouteRecommendation } from "@/lib/route-options";
import { routeErrorMessage, type RouteOption, type RouteRecommendation } from "@/lib/route-metrics";

export function CityPilot({ initialDestination }: { initialDestination: string }) {
  const [origin, setOrigin] = useState("Columbia University");
  const [originLocation, setOriginLocation] = useState<Coordinates | null>(COLUMBIA_LOCATION);
  const [destination, setDestination] = useState(initialDestination || "Smalls Jazz Club");
  const [destinationLocation, setDestinationLocation] = useState<Coordinates | null>(null);
  const [arriveByDate, setArriveByDate] = useState("");
  const [arriveByTime, setArriveByTime] = useState("");
  const [travelMode, setTravelMode] = useState<TravelMode>("Transit");
  const [drivingCost, setDrivingCost] = useState("");
  const [options, setOptions] = useState<RouteOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recommendation, setRecommendation] = useState<RouteRecommendation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const requestRef = useRef(0);
  const aiController = useRef<AbortController | null>(null);

  useEffect(() => {
    const target = new Date(Date.now() + 60 * 60 * 1000);
    const pad = (value: number) => String(value).padStart(2, "0");
    setArriveByDate(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`);
    setArriveByTime(`${pad(target.getHours())}:${pad(target.getMinutes())}`);
    return () => { requestRef.current += 1; aiController.current?.abort(); };
  }, []);

  function invalidate() {
    requestRef.current += 1;
    aiController.current?.abort();
    setOptions([]); setRecommendation(null); setAiLoading(false); setAiError(""); setError(""); setBusy(false);
  }

  async function planTrip() {
    invalidate();
    const request = requestRef.current;
    const deadline = new Date(`${arriveByDate}T${arriveByTime}:00`);
    const cost = drivingCost.trim() === "" ? null : Number(drivingCost);
    if (!Number.isFinite(deadline.getTime()) || deadline.getTime() <= Date.now() || deadline.getTime() > Date.now() + 100 * 86400000) {
      setError("Choose an arrival time in the future, within the next 100 days."); return;
    }
    if (cost != null && (!Number.isFinite(cost) || cost < 0 || cost > 100000)) {
      setError("Enter a valid driving cost, or leave it blank."); return;
    }
    setBusy(true);
    try {
      const results = await compareRoutes(originLocation ?? `${origin}, New York City`, destinationLocation ?? `${destination}, New York City`, deadline, cost);
      if (request !== requestRef.current) return;
      setOptions(results); setBusy(false);
      const available = results.filter((option) => option.metrics);
      if (!available.length) return;
      if (!available.some((option) => option.mode === travelMode)) setTravelMode(available[0].mode);
      setAiLoading(true);
      const controller = new AbortController();
      aiController.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 30000);
      try {
        const result = await getRouteRecommendation(available, controller.signal);
        if (request === requestRef.current) setRecommendation(result);
      } catch (cause) {
        if (request === requestRef.current) setAiError(cause instanceof Error && cause.name !== "AbortError" && !(cause instanceof TypeError) ? cause.message : "Grok is unavailable right now. You can still compare and choose a route manually.");
      } finally {
        window.clearTimeout(timeout);
        if (request === requestRef.current) setAiLoading(false);
      }
    } catch (cause) {
      if (request === requestRef.current) { setError(routeErrorMessage(cause)); setBusy(false); }
    }
  }

  const selected = options.find((option) => option.mode === travelMode && option.metrics);
  return (
    <div className="relative left-1/2 -mt-12 w-screen max-w-none -translate-x-1/2 px-5 pb-12 sm:px-8 xl:px-12 2xl:px-16">
      <div className="mx-auto max-w-[1600px]">
        <header className="border-b border-[#e3e4e0] pb-6 pt-9">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0039a6]">NextStop</p>
          <h1 className="text-[2.35rem] font-semibold leading-none tracking-[-0.055em] text-[#151719] sm:text-[2.8rem]">Find your best way there.</h1>
          <p className="mt-3 text-sm text-[#5f6469]">Compare walking, driving, and transit. Let Grok weigh the tradeoffs.</p>
        </header>
        <section aria-label="NextStop trip workspace" className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] lg:gap-6">
          <div className="min-w-0">
            <TripPlanner origin={origin} destination={destination} originLocation={originLocation}
              arriveByDate={arriveByDate} arriveByTime={arriveByTime} travelMode={travelMode} drivingCost={drivingCost} busy={busy}
              onOriginChange={(value) => { invalidate(); setOrigin(value); setOriginLocation(null); }}
              onOriginSelect={(location) => setOriginLocation(location.location)}
              onDestinationChange={(value) => { invalidate(); setDestination(value); setDestinationLocation(null); }}
              onDestinationSelect={(location) => setDestinationLocation(location.location)}
              onArriveByDateChange={(value) => { invalidate(); setArriveByDate(value); }}
              onArriveByTimeChange={(value) => { invalidate(); setArriveByTime(value); }}
              onDrivingCostChange={(value) => { invalidate(); setDrivingCost(value); }}
              onTravelModeChange={setTravelMode} onPlan={() => void planTrip()} />
            {error && <p role="alert" className="mt-3 rounded-xl bg-[#fff1ee] p-4 text-sm text-[#b3261e]">{error}</p>}
            {selected && <RouteDetails option={selected} origin={origin} destination={destination} />}
          </div>
          <div className="min-w-0">
            <RouteComparison options={options} selected={travelMode} onSelect={setTravelMode} recommendation={recommendation} aiLoading={aiLoading} aiError={aiError} />
            <CityPilotMap route={selected?.route} />
          </div>
        </section>
        <p className="mt-5 text-[10px] leading-4 text-[#767b80]">Routes and schedules are estimates from Google Maps. Grok compares the available data; missing fares and wait times stay unknown. Route endpoints must be within the NYC map bounds.</p>
      </div>
    </div>
  );
}
