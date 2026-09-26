"use client";

import { useState } from "react";
import { ActiveTripView } from "@/components/citypilot/ActiveTripView";
import { CityPilotMap } from "@/components/citypilot/CityPilotMap";
import { LeaveTimeCard } from "@/components/citypilot/LeaveTimeCard";
import { RouteTimeline } from "@/components/citypilot/RouteTimeline";
import { TripBreakdown } from "@/components/citypilot/TripBreakdown";
import { TripPlanner, type TravelMode } from "@/components/citypilot/TripPlanner";

type TripPhase = "planning" | "planned" | "active";
type PlannedTrip = { leaveAt: string; eta: string; arriveBy: string; destination: string; mode: TravelMode };

const planDurations: Record<TravelMode, { transit: number; driving: number; walking: number; buffer: number; total: number }> = {
  Transit: { transit: 24, driving: 0, walking: 9, buffer: 6, total: 39 },
  Drive: { transit: 0, driving: 31, walking: 4, buffer: 8, total: 43 },
  Walk: { transit: 0, driving: 0, walking: 52, buffer: 10, total: 62 },
};

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

export function CityPilot({ initialDestination }: { initialDestination: string }) {
  const [phase, setPhase] = useState<TripPhase>("planning");
  const [origin, setOrigin] = useState("Columbia University");
  const [destination, setDestination] = useState(initialDestination || "Smalls Jazz Club");
  const [arriveByDate, setArriveByDate] = useState("2026-09-26");
  const [arriveByTime, setArriveByTime] = useState("19:30");
  const [travelMode, setTravelMode] = useState<TravelMode>("Transit");
  const [plannedTrip, setPlannedTrip] = useState<PlannedTrip | null>(null);

  function planTrip() {
    const deadline = new Date(`${arriveByDate}T${arriveByTime}:00`);
    const eta = new Date(deadline.getTime() - 9 * 60_000);
    const leaveAt = new Date(eta.getTime() - planDurations[travelMode].total * 60_000);
    setPlannedTrip({ leaveAt: formatTime(leaveAt), eta: formatTime(eta), arriveBy: formatTime(deadline), destination, mode: travelMode });
    setPhase("planned");
  }

  return (
    <div className="relative left-1/2 -mt-12 w-screen max-w-none -translate-x-1/2 px-5 pb-12 sm:px-8 xl:px-12 2xl:px-16">
      <div className="mx-auto max-w-[1600px]">
        <header className="border-b border-[#e3e4e0] pb-5 pt-8 sm:pb-6 sm:pt-9">
          <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0039a6]">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#0039a6] text-white"><span className="size-1.5 rounded-full bg-white" /></span>
            NextStop
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[2.35rem] font-semibold leading-none tracking-[-0.055em] text-[#151719] sm:text-[2.8rem]">Get there on time.</h1>
              <p className="mt-3 text-sm text-[#5f6469] sm:text-[15px]">Tell us when you need to arrive. We&apos;ll work backwards from there.</p>
            </div>
            {phase !== "planning" && <span className="mb-0.5 inline-flex items-center gap-2 rounded-full border border-[#dfe3e7] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#5d6369]"><span className={`size-1.5 rounded-full ${phase === "active" ? "bg-[#d52e29]" : "bg-[#008044]"}`} />{phase === "active" ? "Trip preview" : "Plan ready"}</span>}
          </div>
        </header>

        <section aria-label="NextStop trip workspace" className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] lg:gap-6">
          <div className="min-w-0">
            {phase === "planning" && (
              <TripPlanner
                origin={origin}
                destination={destination}
                arriveByDate={arriveByDate}
                arriveByTime={arriveByTime}
                travelMode={travelMode}
                onOriginChange={setOrigin}
                onDestinationChange={setDestination}
                onArriveByDateChange={setArriveByDate}
                onArriveByTimeChange={setArriveByTime}
                onTravelModeChange={setTravelMode}
                onPlan={planTrip}
              />
            )}

            {phase === "planned" && plannedTrip && (
              <div className="space-y-5">
                <LeaveTimeCard trip={plannedTrip} />
                <RouteTimeline origin={origin} destination={plannedTrip.destination} mode={plannedTrip.mode} />
                <TripBreakdown mode={plannedTrip.mode} />
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setPhase("active")} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0039a6] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#002d85]">Start trip <span aria-hidden="true">→</span></button>
                  <button type="button" onClick={() => setPhase("planning")} className="min-h-12 rounded-xl border border-[#d9dcd9] bg-white px-5 text-sm font-semibold text-[#34393d] hover:bg-[#f3f4f1]">Edit trip</button>
                </div>
              </div>
            )}

            {phase === "active" && plannedTrip && <ActiveTripView trip={plannedTrip} onEnd={() => setPhase("planned")} />}
          </div>
          <CityPilotMap />
        </section>

        <p className="mt-5 text-center text-[10px] leading-4 text-[#767b80] sm:text-left">NextStop plans are illustrative previews. Live routing and service data are not connected yet.</p>
      </div>
    </div>
  );
}
