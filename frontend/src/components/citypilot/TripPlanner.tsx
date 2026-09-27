import { Icon } from "@/components/ui/Icon";
import { LocationInput } from "@/components/citypilot/LocationInput";
import { NYC_CENTER, type SelectedLocation, type TripLocation } from "@/lib/location-suggestions";
import type { UserLocationError, UserLocationStatus } from "@/hooks/useUserLocation";
import type { RouteMode } from "@/lib/route-metrics";

export type TravelMode = RouteMode;

export function TripPlanner({ origin, destination, arriveByDate, arriveByTime, busy, locationStatus, locationError, usingCurrentLocation, returning, onOriginChange, onOriginSelect, onDestinationChange, onDestinationSelect, onArriveByDateChange, onArriveByTimeChange, onUseCurrentLocation, onPlan }: {
  origin: TripLocation;
  destination: TripLocation;
  busy: boolean;
  locationStatus: UserLocationStatus;
  locationError: UserLocationError | null;
  usingCurrentLocation: boolean;
  arriveByDate: string;
  arriveByTime: string;
  returning: boolean;
  onOriginChange: (value: string) => void;
  onOriginSelect: (location: SelectedLocation) => void;
  onDestinationChange: (value: string) => void;
  onDestinationSelect: (location: SelectedLocation) => void;
  onArriveByDateChange: (value: string) => void;
  onArriveByTimeChange: (value: string) => void;
  onUseCurrentLocation: () => void;
  onPlan: () => void;
}) {
  return (
    <form onSubmit={(event) => { event.preventDefault(); onPlan(); }} className={`nextstop-planner rounded-2xl border border-[#e1e3df] bg-white p-5 shadow-[0_4px_18px_rgba(21,23,25,0.04)] sm:p-6${returning ? " nextstop-planner-returning" : ""}`}>
      <div className="nextstop-planner-heading mb-5 flex items-center justify-between gap-3 border-b border-[#ecece8] pb-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-[#191c1e]">Plan your arrival</h2>
          <p className="mt-1 text-xs text-[#686e73]">We&apos;ll work backwards from your deadline.</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-full bg-[#eef3fb] text-[#0039a6]"><Icon name="route" size={19} /></span>
      </div>

      <div className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-3 gap-y-4">
        <div aria-hidden="true" className={`nextstop-route-track row-span-2 flex flex-col items-center py-9${busy ? " is-busy" : ""}`}>
          <span className="nextstop-origin-marker size-2.5 shrink-0 rounded-full border-2 border-[#0039a6] bg-white" />
          <span className="nextstop-route-line relative w-px flex-1 border-l border-dashed border-[#aebbd0]" />
          <span className="nextstop-destination-marker size-2.5 shrink-0 rounded-full bg-[#151719] ring-2 ring-white" />
        </div>
        <div className="nextstop-origin-field">
          <LocationInput id="citypilot-origin" label="From" value={origin.label} placeholder="Search location…" origin={origin.latitude != null && origin.longitude != null ? { lat: origin.latitude, lng: origin.longitude } : NYC_CENTER} onChange={onOriginChange} onSelect={onOriginSelect} locationStatus={locationStatus} locationError={locationError} usingCurrentLocation={usingCurrentLocation} onUseCurrentLocation={onUseCurrentLocation} />
        </div>
        <div className="nextstop-destination-field"><LocationInput id="citypilot-destination" label="To" value={destination.label} placeholder="Search location…" origin={origin.latitude != null && origin.longitude != null ? { lat: origin.latitude, lng: origin.longitude } : NYC_CENTER} onChange={onDestinationChange} onSelect={onDestinationSelect} pinClassName="text-[#d52e29]" /></div>
      </div>
      <p className="nextstop-route-helper ml-8 mt-2 text-[10px] leading-4 text-[#777c81]">Search is powered by Google Maps. Choose a result to preserve its coordinates.</p>

      <fieldset className="nextstop-arrival-controls mt-6">
        <legend className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#62666b]">Arrive by</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="min-w-0">
            <span className="sr-only">Arrival date</span>
            <input type="date" required value={arriveByDate} onChange={(event) => onArriveByDateChange(event.target.value)} className="nextstop-input h-12 w-full rounded-lg border border-[#d9dcd9] bg-white px-3 text-sm text-[#24282c] outline-none focus:border-[#0039a6] focus:ring-2 focus:ring-[#0039a6]/10" />
          </label>
          <label className="min-w-0">
            <span className="sr-only">Arrival time</span>
            <input type="time" required value={arriveByTime} onChange={(event) => onArriveByTimeChange(event.target.value)} className="nextstop-input h-12 w-full rounded-lg border border-[#d9dcd9] bg-white px-3 text-sm text-[#24282c] outline-none focus:border-[#0039a6] focus:ring-2 focus:ring-[#0039a6]/10" />
          </label>
        </div>
      </fieldset>

      <button type="submit" disabled={busy} className="nextstop-compare-button group mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0039a6] px-5 text-sm font-semibold text-white disabled:opacity-60"><span>{busy ? "Comparing routes…" : "Compare routes"}</span>{busy && <span aria-hidden="true" className="nextstop-loading-dots"><i /><i /><i /></span>} <Icon name="arrow-right" size={17} className="nextstop-compare-arrow" /></button>
      <p className="nextstop-planner-note mt-3 text-center text-[10px] leading-4 text-[#777c81]">Google route estimates, compared by Grok. Prices and schedules may change.</p>
    </form>
  );
}
