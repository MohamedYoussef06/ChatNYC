import type { Place } from "@/lib/types";

export function PlaceCard({ place }: { place: Place }) {
  return (
    <article className="card">
      <p className="eyebrow">{place.neighborhood}</p>
      <h2>{place.name}</h2>
      <p>{place.summary}</p>
    </article>
  );
}
