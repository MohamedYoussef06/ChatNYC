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
        {trip ? <Map origin={trip.origin} destination={trip.destination} /> : null}
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
