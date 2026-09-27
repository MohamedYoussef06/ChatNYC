import type { Trip } from "@/lib/types";

export function TripCard({ trip }: { trip: Trip }) {
  const recommendation = trip.recommendation;

  return (
    <article className="card">
      <p className="eyebrow">CityPilot</p>
      <h2>{trip.title}</h2>
      <p>
        {trip.origin} to {trip.destination}
      </p>
      <p>{trip.summary}</p>
      {recommendation ? (
        <p className="recommendation">
          Grok pick: <strong>{recommendation.recommended_mode}</strong> — {recommendation.reason}
        </p>
      ) : (
        <p className="muted">
          No Grok recommendation yet. Paste your key into{" "}
          <code>GROK_API_KEY</code> in <code>backend/.env.local</code> to enable it.
        </p>
      )}
    </article>
  );
}
