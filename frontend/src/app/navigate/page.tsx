import { Map } from "@/components/Map";
import { TripCard } from "@/components/TripCard";
import { getTrips } from "@/lib/api";

export default async function NavigatePage() {
  try {
    const trips = await getTrips();
    const trip = trips[0];
    return (
      <>
        <h1>Navigate</h1>
        <p className="lede">
          Compare walking, driving, and transit. Grok highlights a recommended option when an API
          key is configured.
        </p>
        {trip ? (
          <Map
            origin={trip.origin}
            destination={trip.destination}
            options={trip.options ?? []}
            recommendedMode={trip.recommendation?.recommended_mode ?? null}
          />
        ) : null}
        {trips.map((item) => (
          <TripCard key={item.id} trip={item} />
        ))}
      </>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load a trip.";
    return (
      <>
        <h1>Navigate</h1>
        <p className="error">{message}</p>
      </>
    );
  }
}
