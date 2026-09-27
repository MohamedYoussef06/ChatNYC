import type { Trip } from "@/lib/types";

export function TripCard({ trip }: { trip: Trip }) {
  return (
    <article className="card">
      <p className="eyebrow">NextStop</p>
      <h2>{trip.title}</h2>
      <p>
        {trip.origin} to {trip.destination}
      </p>
      <p>{trip.summary}</p>
    </article>
  );
}
